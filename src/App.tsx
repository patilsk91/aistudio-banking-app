import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Account, ServiceId, ServiceConfig, TraceLog, ServiceLog, BrokerMessage 
} from './types';
import TopologyGraph from './components/TopologyGraph';
import BankingPortal from './components/BankingPortal';
import ServiceController from './components/ServiceController';
import TraceViewer from './components/TraceViewer';
import MetricsPanel from './components/MetricsPanel';
import { Landmark, Activity, Layers, ServerCrash, RotateCcw } from 'lucide-react';

export default function App() {
  // Application states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [services, setServices] = useState<Record<ServiceId, ServiceConfig>>({} as any);
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [brokerMessages, setBrokerMessages] = useState<BrokerMessage[]>([]);
  
  // Selection states for debugging
  const [selectedTrace, setSelectedTrace] = useState<TraceLog | null>(null);
  const [hoveredService, setHoveredService] = useState<ServiceId | null>(null);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // We keep a reference to selectedAccount ID to keep selection during poll updates
  const selectedAccountIdRef = useRef<string | null>(null);

  // Fetch complete cluster telemetry state
  const fetchClusterState = useCallback(async (isPoll: boolean = false) => {
    try {
      // Parallel API loads
      const [statusRes, accountsRes, tracesRes, logsRes] = await Promise.all([
        fetch('/api/services/status'),
        fetch('/api/gateway/accounts'),
        fetch('/api/services/traces'),
        fetch('/api/services/logs')
      ]);

      if (!statusRes.ok || !accountsRes.ok) {
        throw new Error("Cluster control-plane unreachable.");
      }

      const statusData = await statusRes.json();
      const accountsJson = await accountsRes.json();
      const tracesJson = await tracesRes.json();
      const logsJson = await logsRes.json();

      setServices(statusData.services);
      setBrokerMessages(statusData.brokerMessages || []);
      
      const accList: Account[] = accountsJson.data || [];
      setAccounts(accList);

      // Keep selection active
      if (accList.length > 0) {
        if (selectedAccountIdRef.current) {
          const current = accList.find(a => a.id === selectedAccountIdRef.current);
          if (current) setSelectedAccount(current);
        } else {
          setSelectedAccount(accList[0]);
          selectedAccountIdRef.current = accList[0].id;
        }
      }

      setTraces(tracesJson);
      setLogs(logsJson);
      
    } catch (err) {
      console.error("Failure polling service logs and traces.", err);
    } finally {
      if (!isPoll) {
        setIsInitialLoading(false);
      }
    }
  }, []);

  // Poll state every 2 seconds
  useEffect(() => {
    fetchClusterState();
    const interval = setInterval(() => fetchClusterState(true), 2500);
    return () => clearInterval(interval);
  }, [fetchClusterState]);

  // Set selected account
  const handleSelectAccount = (acc: Account) => {
    setSelectedAccount(acc);
    selectedAccountIdRef.current = acc.id;
  };

  // Perform a gateway transaction (e.g. transfer, deposit, loan payout, freeze card)
  const handleGatewayAction = async (
    actionName: string, 
    endpoint: string, 
    method: 'GET' | 'POST', 
    body?: any
  ) => {
    setIsProcessing(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sample-oauth-jwt-header-key'
        }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(endpoint, options);
      const resJson = await res.json();

      // Refresh state immediately after action to ensure high-fidelity latency update
      await fetchClusterState(true);

      // Extract generated trace from API response to highlight in APM right away!
      if (resJson.trace) {
        setSelectedTrace(resJson.trace);
      }

      if (!res.ok || resJson.success === false) {
        throw new Error(resJson.error || `Microservice gateway call returned HTTP ${res.status}`);
      }

    } catch (err: any) {
      console.error(`Gateway action failure during: ${actionName}`, err);
      throw err; // bubble up so component forms display inline feedback toasts
    } finally {
      setIsProcessing(false);
    }
  };

  // Chaos settings update for specific services
  const handleUpdateServiceConfig = async (id: ServiceId, updates: Partial<ServiceConfig>) => {
    try {
      const res = await fetch(`/api/services/status/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to configure cluster service parameters.");
      
      // Update locally immediately for instant UX updates, then fetch poll in background
      setServices(prev => {
        const target = prev[id];
        if (!target) return prev;
        return {
          ...prev,
          [id]: { ...target, ...updates }
        };
      });
    } catch (err) {
      console.error("Error setting chaos rules.", err);
    }
  };

  // Reset Cluster State
  const handleResetCluster = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/services/reset', { method: 'POST' });
      if (res.ok) {
        setSelectedTrace(null);
        setSelectedAccount(null);
        selectedAccountIdRef.current = null;
        await fetchClusterState(false);
      }
    } catch (err) {
      console.error("Reset command failed.", err);
    } finally {
      setIsResetting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <Landmark className="w-12 h-12 text-indigo-500 animate-pulse" />
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-tight">Booting Microservices Control-Plane...</h1>
            <p className="text-xs text-slate-500 mt-1">Spinning up Node virtual containers & Kafka topic queues.</p>
          </div>
          <div className="w-48 h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-indigo-600 rounded-full animate-[loading_1.5s_infinite]" />
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Count active failures or degraded service to show a warning in header
  const degradedCount = (Object.values(services) as ServiceConfig[]).filter(s => s.status === 'degraded').length;
  const offlineCount = (Object.values(services) as ServiceConfig[]).filter(s => s.status === 'offline').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-6 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
              <Landmark className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold tracking-tight text-slate-100 flex items-center gap-2">
                ApexBank <span className="font-sans text-xs font-normal text-slate-400">Microservices PoC</span>
                <span className="text-[9px] bg-indigo-950 text-indigo-400 font-mono border border-indigo-900/40 px-2 py-0.5 rounded-lg font-semibold uppercase tracking-wider">
                  Architecture Sandbox
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Distributed Request Tracing, Chaos Engineering & Event Streaming Console</p>
            </div>
          </div>
        </div>

        {/* Global Cluster Status Indicators */}
        <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-850 rounded-xl p-2 px-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-slate-300">Cluster Hub:</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span>Online: <b className="text-emerald-400 font-bold">{7 - degradedCount - offlineCount}</b></span>
            {degradedCount > 0 && <span className="text-amber-400">Degraded: <b>{degradedCount}</b></span>}
            {offlineCount > 0 && (
              <span className="text-rose-400 flex items-center gap-1 animate-pulse">
                <ServerCrash className="w-3.5 h-3.5" /> Offline: <b>{offlineCount}</b>
              </span>
            )}
            {degradedCount === 0 && offlineCount === 0 && (
              <span className="text-emerald-400 font-bold">● CLUSTER HEALTHY</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 gap-6">
        
        {/* Row 1: Interactive SVG Topology Graph */}
        <section className="w-full">
          <TopologyGraph
            services={services}
            activeTrace={selectedTrace}
            hoveredService={hoveredService}
            onHoverService={setHoveredService}
          />
        </section>

        {/* Row 2: Bento Grid for Banking Client + Chaos Controls + Telemetry APM */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Column A: Client Bank Application (5 Cols) */}
          <div className="lg:col-span-5 h-full">
            <BankingPortal
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelectAccount={handleSelectAccount}
              onAction={handleGatewayAction}
              isProcessing={isProcessing}
            />
          </div>

          {/* Column B: Chaos Engine & Configuration Board (4 Cols) */}
          <div className="lg:col-span-4 h-full">
            <ServiceController
              services={services}
              onUpdateService={handleUpdateServiceConfig}
              onResetAll={handleResetCluster}
              isResetting={isResetting}
            />
          </div>

          {/* Column C: Telemetry, Stats & Kafka (3 Cols) */}
          <div className="lg:col-span-3 h-full">
            <MetricsPanel
              services={services}
              logs={logs}
              brokerMessages={brokerMessages}
            />
          </div>

        </section>

        {/* Row 3: Jaeger APM Trace Waterfall Analyzer */}
        <section className="w-full">
          <TraceViewer
            traces={traces}
            selectedTrace={selectedTrace}
            onSelectTrace={setSelectedTrace}
          />
        </section>

      </main>

      {/* Humble Footer */}
      <footer className="max-w-7xl mx-auto mt-10 border-t border-slate-850 pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono gap-4">
        <div>
          <p>© 2026 ApexBank Systems Ltd. Certified PoC Environment.</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Mock transactions represent non-fungible virtual tokens only.</p>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-indigo-400 transition cursor-pointer">Security Compliance</span>
          <span>•</span>
          <span className="hover:text-indigo-400 transition cursor-pointer">ISO 27001 Hub</span>
          <span>•</span>
          <button 
            onClick={handleResetCluster}
            className="hover:text-rose-400 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Hard Reset
          </button>
        </div>
      </footer>
    </div>
  );
}
