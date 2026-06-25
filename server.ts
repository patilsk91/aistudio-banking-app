import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  Account, Transaction, Loan, ServiceId, ServiceConfig, 
  TraceLog, TraceHop, ServiceLog, BrokerMessage 
} from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// IN-MEMORY SIMULATOR STATE
// ==========================================

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "user-1",
    accountNumber: "ACC-100200300",
    name: "Jane Cooper",
    balance: 24500.00,
    card: {
      cardNumber: "4532 7812 9012 3456",
      cvv: "482",
      expiry: "12/28",
      status: "active"
    },
    loans: [],
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-2",
    accountNumber: "ACC-400500600",
    name: "Alex Rivera",
    balance: 1250.50,
    card: {
      cardNumber: "4532 9081 2345 6789",
      cvv: "119",
      expiry: "06/29",
      status: "active"
    },
    loans: [],
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-3",
    accountNumber: "ACC-700800900",
    name: "Marcus Vance",
    balance: 92100.00,
    card: {
      cardNumber: "4532 1122 3344 5566",
      cvv: "902",
      expiry: "10/30",
      status: "active"
    },
    loans: [],
    createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let accounts: Account[] = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
let transactions: Transaction[] = [];
let brokerQueue: BrokerMessage[] = [];
let traces: TraceLog[] = [];
let logs: ServiceLog[] = [];

// Initialize Microservice Configs
const serviceConfigs: Record<ServiceId, ServiceConfig> = {
  gateway: {
    id: "gateway",
    name: "API Gateway",
    status: "online",
    latencyMs: 15,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 12,
    memoryUsage: 128
  },
  auth: {
    id: "auth",
    name: "Auth Service",
    status: "online",
    latencyMs: 25,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 8,
    memoryUsage: 96
  },
  accounts: {
    id: "accounts",
    name: "Accounts Service",
    status: "online",
    latencyMs: 35,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 18,
    memoryUsage: 192
  },
  transactions: {
    id: "transactions",
    name: "Transactions Service",
    status: "online",
    latencyMs: 40,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 22,
    memoryUsage: 256
  },
  loans: {
    id: "loans",
    name: "Loans & Credit Service",
    status: "online",
    latencyMs: 50,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 15,
    memoryUsage: 180
  },
  notifications: {
    id: "notifications",
    name: "Notification Service",
    status: "online",
    latencyMs: 20,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 5,
    memoryUsage: 80
  },
  broker: {
    id: "broker",
    name: "Event Broker (Kafka)",
    status: "online",
    latencyMs: 10,
    failureRate: 0,
    requestCount: 0,
    errorCount: 0,
    cpuUsage: 14,
    memoryUsage: 512
  }
};

// ==========================================
// SIMULATOR HELPER FUNCTIONS
// ==========================================

// Fluctuates CPU/Memory of all services to simulate realistic live metrics
function fluctuateMetrics() {
  Object.values(serviceConfigs).forEach(svc => {
    if (svc.status === "offline") {
      svc.cpuUsage = 0;
      svc.memoryUsage = Math.max(10, Math.floor(svc.memoryUsage * 0.9));
      return;
    }
    
    const baseCpu = svc.id === "transactions" ? 20 : svc.id === "accounts" ? 15 : 10;
    const baseMem = svc.id === "broker" ? 512 : svc.id === "transactions" ? 256 : 128;
    
    const statusModifier = svc.status === "degraded" ? 1.8 : 1.0;
    
    // Add small random walk
    const cpuDiff = (Math.random() - 0.5) * 4;
    svc.cpuUsage = Math.min(95, Math.max(1, Math.round((baseCpu + cpuDiff) * statusModifier)));
    
    const memDiff = (Math.random() - 0.5) * 8;
    svc.memoryUsage = Math.min(1024, Math.max(20, Math.round((baseMem + memDiff) * statusModifier)));
  });
}

// Keep metrics ticking
setInterval(fluctuateMetrics, 3000);

// Log to internal service logs
function addServiceLog(serviceId: ServiceId, level: 'info' | 'warn' | 'error', message: string, traceId?: string) {
  const log: ServiceLog = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    serviceId,
    level,
    message,
    timestamp: new Date().toISOString(),
    traceId
  };
  logs.unshift(log);
  if (logs.length > 200) logs.pop();
  
  // Also log to node console for transparency
  console.log(`[${serviceId.toUpperCase()}] [${level.toUpperCase()}] ${traceId ? `[Trace: ${traceId}] ` : ''}${message}`);
}

// Wait helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// core execution wrapper simulating a service invocation
async function callService<T>(
  traceId: string,
  serviceId: ServiceId,
  action: string,
  executor: () => Promise<T> | T
): Promise<{ value: T; hop: TraceHop }> {
  const startTime = Date.now();
  const config = serviceConfigs[serviceId];
  config.requestCount++;
  
  const timestamp = new Date().toISOString();
  
  // 1. Check if offline
  if (config.status === "offline") {
    config.errorCount++;
    addServiceLog(serviceId, "error", `Failed connection: Service is OFFLINE during: ${action}`, traceId);
    const duration = Date.now() - startTime;
    const hop: TraceHop = {
      serviceId,
      action,
      durationMs: duration,
      timestamp,
      status: "failed",
      error: "503 Service Unavailable"
    };
    throw { status: 503, message: `Service ${config.name} is offline.`, hop };
  }
  
  // 2. Latency injection (with dynamic variation)
  const baseLatency = config.latencyMs;
  const jitter = Math.floor(Math.random() * 12) - 4; // -4ms to +8ms
  const activeLatency = Math.max(0, baseLatency + jitter);
  if (activeLatency > 0) {
    await delay(activeLatency);
  }
  
  // 3. Simulated failure injection
  if (config.failureRate > 0 && Math.random() * 100 < config.failureRate) {
    config.errorCount++;
    addServiceLog(serviceId, "error", `Injected fault trigger: Internal Server Error (500) during: ${action}`, traceId);
    const duration = Date.now() - startTime;
    const hop: TraceHop = {
      serviceId,
      action,
      durationMs: duration,
      timestamp,
      status: "failed",
      error: "500 Internal Server Error (Simulated)"
    };
    throw { status: 500, message: `Simulated fault in ${config.name}.`, hop };
  }
  
  try {
    addServiceLog(serviceId, "info", `Executing: ${action}`, traceId);
    const result = await executor();
    const duration = Date.now() - startTime;
    
    const hop: TraceHop = {
      serviceId,
      action,
      durationMs: duration,
      timestamp,
      status: config.status === "degraded" ? "degraded" : "success"
    };
    
    return { value: result, hop };
  } catch (err: any) {
    config.errorCount++;
    const duration = Date.now() - startTime;
    const errorMessage = err?.message || String(err);
    addServiceLog(serviceId, "error", `Error executing "${action}": ${errorMessage}`, traceId);
    
    const hop: TraceHop = {
      serviceId,
      action,
      durationMs: duration,
      timestamp,
      status: "failed",
      error: errorMessage
    };
    throw { status: err.status || 500, message: errorMessage, hop };
  }
}

// Simulated Message Queue Dispatch
function dispatchBrokerMessage(traceId: string, topic: string, payload: any) {
  const msg: BrokerMessage = {
    id: `msg-${Math.random().toString(36).substring(2, 11)}`,
    topic,
    payload,
    timestamp: new Date().toISOString(),
    status: "pending"
  };
  
  brokerQueue.unshift(msg);
  if (brokerQueue.length > 50) brokerQueue.pop();
  
  addServiceLog("broker", "info", `Published event [${topic}] to topic queue.`, traceId);
  
  // Asynchronous background consumer logic (Notification Service consumes from Broker)
  setTimeout(async () => {
    const notifyConfig = serviceConfigs.notifications;
    const brokerConfig = serviceConfigs.broker;
    
    if (brokerConfig.status === "offline") {
      msg.status = "failed";
      addServiceLog("broker", "error", `Broker offline. Message delivery failed for event: ${topic}`, traceId);
      return;
    }
    
    if (notifyConfig.status === "offline") {
      msg.status = "failed";
      addServiceLog("notifications", "error", `Notification Service offline. Message dead-lettered for event: ${topic}`, traceId);
      return;
    }
    
    // Simulate consuming delay
    const processingDelay = notifyConfig.latencyMs + Math.floor(Math.random() * 20);
    await delay(processingDelay);
    
    msg.status = "delivered";
    notifyConfig.requestCount++;
    addServiceLog("notifications", "info", `Consumed event [${topic}] successfully. Dispatched Alert notification.`, traceId);
  }, 1000);
}

// Generate a random trace ID
function generateTraceId() {
  return `trace_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString().slice(-4)}`;
}

// Save complete trace
function saveTrace(trace: TraceLog) {
  traces.unshift(trace);
  if (traces.length > 100) traces.pop();
}

// ==========================================
// CONTROL & TELEMETRY API ENDPOINTS
// ==========================================

// Get list of service configurations
app.get("/api/services/status", (req, res) => {
  res.json({
    services: serviceConfigs,
    brokerMessages: brokerQueue.slice(0, 15)
  });
});

// Update configurations
app.post("/api/services/status/:id", (req, res) => {
  const { id } = req.params;
  const { status, latencyMs, failureRate } = req.body;
  
  const svc = serviceConfigs[id as ServiceId];
  if (!svc) {
    return res.status(404).json({ error: "Service not found" });
  }
  
  if (status !== undefined) svc.status = status;
  if (latencyMs !== undefined) svc.latencyMs = Math.max(0, Number(latencyMs));
  if (failureRate !== undefined) svc.failureRate = Math.min(100, Math.max(0, Number(failureRate)));
  
  addServiceLog("gateway", "warn", `Config updated for ${svc.name}: status=${svc.status}, latency=${svc.latencyMs}ms, failureRate=${svc.failureRate}%`);
  res.json({ success: true, service: svc });
});

// Get Trace list
app.get("/api/services/traces", (req, res) => {
  res.json(traces);
});

// Get Service Logs
app.get("/api/services/logs", (req, res) => {
  const { serviceId, traceId } = req.query;
  let filtered = logs;
  if (serviceId) {
    filtered = filtered.filter(l => l.serviceId === serviceId);
  }
  if (traceId) {
    filtered = filtered.filter(l => l.traceId === traceId);
  }
  res.json(filtered.slice(0, 80));
});

// Reset entire banking state
app.post("/api/services/reset", (req, res) => {
  accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  transactions = [];
  brokerQueue = [];
  traces = [];
  logs = [];
  
  // Reset configs
  Object.keys(serviceConfigs).forEach((key) => {
    const svc = serviceConfigs[key as ServiceId];
    svc.status = "online";
    svc.failureRate = 0;
    svc.requestCount = 0;
    svc.errorCount = 0;
    
    // reset to original latencies
    if (key === "gateway") svc.latencyMs = 15;
    else if (key === "auth") svc.latencyMs = 25;
    else if (key === "accounts") svc.latencyMs = 35;
    else if (key === "transactions") svc.latencyMs = 40;
    else if (key === "loans") svc.latencyMs = 50;
    else if (key === "notifications") svc.latencyMs = 20;
    else if (key === "broker") svc.latencyMs = 10;
  });
  
  addServiceLog("gateway", "info", "PoC Simulator database and service topologies reset to default state.");
  res.json({ success: true });
});

// ==========================================
// BANKING API ROUTER (SIMULATING API GATEWAY)
// ==========================================

// Helper to bundle trace recording
async function handleTraceFlow<T>(
  req: express.Request,
  res: express.Response,
  flowName: string,
  flowExecutor: (traceId: string, hops: TraceHop[]) => Promise<T>
) {
  const traceId = generateTraceId();
  const hops: TraceHop[] = [];
  const gatewayStart = Date.now();
  
  addServiceLog("gateway", "info", `Inbound API Request: ${req.method} ${req.originalUrl}`, traceId);
  
  try {
    // Hop 1: API Gateway proxy processing
    const gatewayHopResult = await callService(traceId, "gateway", `Route & Proxy: ${flowName}`, async () => {
      return true;
    });
    hops.push(gatewayHopResult.hop);
    
    // Hop 2: Authenticate through Auth service
    const authHeader = req.headers.authorization || "Bearer token-simulation-xxx";
    const authHopResult = await callService(traceId, "auth", "Validate Session & Credentials", async () => {
      // Simulate checking credentials
      if (!authHeader) {
        throw new Error("401 Unauthorized - Missing bearer credentials");
      }
      return { user: "logged-in-poc-user", role: "customer" };
    });
    hops.push(authHopResult.hop);
    
    // Run the main business logic flow (will push its own hops inside)
    const result = await flowExecutor(traceId, hops);
    
    // Complete Gateway trace
    const totalDuration = Date.now() - gatewayStart;
    const completedTrace: TraceLog = {
      id: traceId,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      totalDurationMs: totalDuration,
      status: 200,
      hops
    };
    saveTrace(completedTrace);
    
    res.json({
      success: true,
      data: result,
      trace: completedTrace
    });
    
  } catch (err: any) {
    // If the error contains a hop object, capture it
    if (err.hop) {
      hops.push(err.hop);
    }
    
    const gatewayErrorDuration = Date.now() - gatewayStart;
    const errStatus = err.status || 500;
    
    const completedTrace: TraceLog = {
      id: traceId,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      totalDurationMs: gatewayErrorDuration,
      status: errStatus,
      hops
    };
    saveTrace(completedTrace);
    
    res.status(errStatus).json({
      success: false,
      error: err.message || "Distributed Microservice Call Chain interrupted.",
      trace: completedTrace
    });
  }
}

// 1. Fetch Accounts
app.get("/api/gateway/accounts", (req, res) => {
  handleTraceFlow(req, res, "Fetch Client Accounts", async (traceId, hops) => {
    const accHop = await callService(traceId, "accounts", "Query Customer Balances", async () => {
      return accounts;
    });
    hops.push(accHop.hop);
    return accHop.value;
  });
});

// 2. Create New Account
app.post("/api/gateway/accounts", (req, res) => {
  const { name, initialDeposit } = req.body;
  
  handleTraceFlow(req, res, "Provision New Ledger Account", async (traceId, hops) => {
    if (!name || name.trim() === "") {
      throw { status: 400, message: "Account holder name is required." };
    }
    
    const depositAmt = Math.max(0, Number(initialDeposit || 0));
    
    const accHop = await callService(traceId, "accounts", "Insert Account and Card Record", async () => {
      const newAccNum = `ACC-${Math.floor(100000 + Math.random() * 900000)}000`;
      const cardNum = `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newAccount: Account = {
        id: `user-${Math.random().toString(36).substring(2, 9)}`,
        accountNumber: newAccNum,
        name,
        balance: depositAmt,
        card: {
          cardNumber: cardNum,
          cvv: String(Math.floor(100 + Math.random() * 900)),
          expiry: "09/31",
          status: "active"
        },
        loans: [],
        createdAt: new Date().toISOString()
      };
      
      accounts.push(newAccount);
      return newAccount;
    });
    
    hops.push(accHop.hop);
    
    // Publish message asynchronously
    dispatchBrokerMessage(traceId, "account.created", { 
      accountNumber: accHop.value.accountNumber, 
      name: accHop.value.name,
      initialBalance: depositAmt
    });
    
    return accHop.value;
  });
});

// 3. Deposit Funds
app.post("/api/gateway/accounts/deposit", (req, res) => {
  const { accountNumber, amount, notes } = req.body;
  
  handleTraceFlow(req, res, "Process Account Credit Deposit", async (traceId, hops) => {
    const depAmount = Number(amount);
    if (!accountNumber || isNaN(depAmount) || depAmount <= 0) {
      throw { status: 400, message: "Valid account number and deposit amount are required." };
    }
    
    // 1. Transactions service registers intent
    const txHop = await callService(traceId, "transactions", "Process Direct Credit Settlement", async () => {
      const targetAcc = accounts.find(a => a.accountNumber === accountNumber);
      if (!targetAcc) {
        throw { status: 404, message: `Account ${accountNumber} not found.` };
      }
      return targetAcc;
    });
    hops.push(txHop.hop);
    
    // 2. Accounts service locks and commits ledger
    const accHop = await callService(traceId, "accounts", "Commit Ledger Account Balances", async () => {
      const targetAcc = accounts.find(a => a.accountNumber === accountNumber)!;
      targetAcc.balance += depAmount;
      
      const tx: Transaction = {
        id: `tx-${Math.random().toString(36).substring(2, 11)}`,
        traceId,
        type: "deposit",
        amount: depAmount,
        status: "success",
        timestamp: new Date().toISOString(),
        toAccount: accountNumber,
        notes: notes || "Direct Deposit Over-the-Counter"
      };
      transactions.unshift(tx);
      return { targetAcc, tx };
    });
    hops.push(accHop.hop);
    
    // Publish async notification
    dispatchBrokerMessage(traceId, "transaction.completed", {
      type: "deposit",
      accountNumber,
      amount: depAmount,
      balance: accHop.value.targetAcc.balance
    });
    
    return {
      account: accHop.value.targetAcc,
      transaction: accHop.value.tx
    };
  });
});

// 4. Transfer Funds (Inter-Account)
app.post("/api/gateway/transactions/transfer", (req, res) => {
  const { fromAccount, toAccount, amount, notes } = req.body;
  
  handleTraceFlow(req, res, "Execute Interbank Transfer", async (traceId, hops) => {
    const transferAmt = Number(amount);
    if (!fromAccount || !toAccount || isNaN(transferAmt) || transferAmt <= 0) {
      throw { status: 400, message: "Valid source, destination, and amount are required." };
    }
    
    if (fromAccount === toAccount) {
      throw { status: 400, message: "Source and destination accounts cannot be the same." };
    }
    
    // 1. Transaction service conducts validation and liquidity checking
    const txHop = await callService(traceId, "transactions", "Validate Account Balances & Fraud Check", async () => {
      const sender = accounts.find(a => a.accountNumber === fromAccount);
      const receiver = accounts.find(a => a.accountNumber === toAccount);
      
      if (!sender) {
        throw { status: 404, message: `Source account ${fromAccount} not found.` };
      }
      if (!receiver) {
        throw { status: 404, message: `Recipient account ${toAccount} not found.` };
      }
      if (sender.balance < transferAmt) {
        throw { status: 422, message: `Insufficient funds. Balance: $${sender.balance.toFixed(2)}` };
      }
      return { sender, receiver };
    });
    hops.push(txHop.hop);
    
    // 2. Accounts service executes double-entry debit-credit
    const accHop = await callService(traceId, "accounts", "Execute Ledger Debit & Credit Entries", async () => {
      const sender = accounts.find(a => a.accountNumber === fromAccount)!;
      const receiver = accounts.find(a => a.accountNumber === toAccount)!;
      
      sender.balance -= transferAmt;
      receiver.balance += transferAmt;
      
      const tx: Transaction = {
        id: `tx-${Math.random().toString(36).substring(2, 11)}`,
        traceId,
        type: "transfer",
        amount: transferAmt,
        status: "success",
        timestamp: new Date().toISOString(),
        fromAccount,
        toAccount,
        notes: notes || "Simulated P2P Transfer"
      };
      transactions.unshift(tx);
      return { sender, receiver, tx };
    });
    hops.push(accHop.hop);
    
    // Publish Broker Event
    dispatchBrokerMessage(traceId, "transaction.completed", {
      type: "transfer",
      fromAccount,
      toAccount,
      amount: transferAmt
    });
    
    return {
      sender: accHop.value.sender,
      receiver: accHop.value.receiver,
      transaction: accHop.value.tx
    };
  });
});

// 5. Apply for Loan
app.post("/api/gateway/loans/apply", (req, res) => {
  const { accountNumber, amount, termMonths, purpose } = req.body;
  
  handleTraceFlow(req, res, "Underwrite Consumer Loan Request", async (traceId, hops) => {
    const loanAmt = Number(amount);
    const months = Number(termMonths || 12);
    
    if (!accountNumber || isNaN(loanAmt) || loanAmt <= 0) {
      throw { status: 400, message: "Valid account and positive loan amount required." };
    }
    
    // Fetch user details in Account service
    const accQueryHop = await callService(traceId, "accounts", "Check Eligibility and Retrieve Credit Profile", async () => {
      const targetAcc = accounts.find(a => a.accountNumber === accountNumber);
      if (!targetAcc) {
        throw { status: 404, message: `Account ${accountNumber} not found.` };
      }
      return targetAcc;
    });
    hops.push(accQueryHop.hop);
    
    const userAcc = accQueryHop.value;
    
    // Underwriting in Loans service
    const loanHop = await callService(traceId, "loans", "Algorithmic Underwriting & Credit Check", async () => {
      // Mock credit score based on balance
      let creditScore = 580;
      if (userAcc.balance > 50000) creditScore = 780;
      else if (userAcc.balance > 15000) creditScore = 700;
      else if (userAcc.balance > 5000) creditScore = 640;
      else if (userAcc.balance > 1000) creditScore = 600;
      
      const approved = creditScore >= 620 && loanAmt < (userAcc.balance * 2);
      const status = approved ? "approved" : "rejected";
      
      const newLoan: Loan = {
        id: `loan-${Math.random().toString(36).substring(2, 9)}`,
        amount: loanAmt,
        termMonths: months,
        purpose: purpose || "General Purpose",
        creditScore,
        status,
        timestamp: new Date().toISOString()
      };
      
      userAcc.loans.push(newLoan);
      return newLoan;
    });
    hops.push(loanHop.hop);
    
    const loanResult = loanHop.value;
    
    // If loan approved, deposit payout asynchronously via transactions/ledger
    if (loanResult.status === "approved") {
      const payoutHop = await callService(traceId, "transactions", "Disburse Loan Payout Funds", async () => {
        userAcc.balance += loanAmt;
        const payoutTx: Transaction = {
          id: `tx-${Math.random().toString(36).substring(2, 11)}`,
          traceId,
          type: "loan_payout",
          amount: loanAmt,
          status: "success",
          timestamp: new Date().toISOString(),
          toAccount: accountNumber,
          notes: `Disbursed funds for Loan ${loanResult.id}`
        };
        transactions.unshift(payoutTx);
        return payoutTx;
      });
      hops.push(payoutHop.hop);
    }
    
    // Broker event
    dispatchBrokerMessage(traceId, "loan.processed", {
      loanId: loanResult.id,
      accountNumber,
      amount: loanAmt,
      status: loanResult.status
    });
    
    return {
      loan: loanResult,
      account: userAcc
    };
  });
});

// 6. Freeze / Unfreeze Card status
app.post("/api/gateway/accounts/card/toggle", (req, res) => {
  const { accountNumber } = req.body;
  
  handleTraceFlow(req, res, "Toggle Card Authorization Status", async (traceId, hops) => {
    if (!accountNumber) {
      throw { status: 400, message: "Account number is required." };
    }
    
    const accHop = await callService(traceId, "accounts", "Update Card Lock Status", async () => {
      const targetAcc = accounts.find(a => a.accountNumber === accountNumber);
      if (!targetAcc) {
        throw { status: 404, message: `Account ${accountNumber} not found.` };
      }
      
      targetAcc.card.status = targetAcc.card.status === "active" ? "frozen" : "active";
      return targetAcc;
    });
    hops.push(accHop.hop);
    
    dispatchBrokerMessage(traceId, "card.status_changed", {
      accountNumber,
      status: accHop.value.card.status
    });
    
    return accHop.value;
  });
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
