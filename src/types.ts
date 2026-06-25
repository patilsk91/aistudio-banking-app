export type ServiceId =
  | 'gateway'
  | 'auth'
  | 'accounts'
  | 'transactions'
  | 'loans'
  | 'notifications'
  | 'broker';

export interface CardDetails {
  cardNumber: string;
  cvv: string;
  expiry: string;
  status: 'active' | 'frozen';
}

export interface Loan {
  id: string;
  amount: number;
  termMonths: number;
  purpose: string;
  creditScore: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  balance: number;
  card: CardDetails;
  loans: Loan[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  traceId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'loan_payout';
  amount: number;
  status: 'success' | 'failed';
  timestamp: string;
  fromAccount?: string; // Account Number
  toAccount?: string;   // Account Number
  notes?: string;
}

export interface ServiceConfig {
  id: ServiceId;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;       // Manual delay added to the service processing
  failureRate: number;     // Percent chance (0 - 100) of returning a 500 error
  requestCount: number;
  errorCount: number;
  cpuUsage: number;        // Percentage
  memoryUsage: number;     // MBs
}

export interface TraceHop {
  serviceId: ServiceId;
  action: string;
  durationMs: number;
  timestamp: string;
  status: 'success' | 'failed' | 'degraded';
  error?: string;
}

export interface TraceLog {
  id: string;
  path: string;
  method: string;
  timestamp: string;
  totalDurationMs: number;
  status: number;
  hops: TraceHop[];
}

export interface ServiceLog {
  id: string;
  serviceId: ServiceId;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  traceId?: string;
}

export interface BrokerMessage {
  id: string;
  topic: string;
  payload: any;
  timestamp: string;
  status: 'pending' | 'delivered' | 'failed';
}
