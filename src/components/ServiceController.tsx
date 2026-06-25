import React from 'react';
import { ServiceId, ServiceConfig } from '../types';
import { Settings, RefreshCw, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

interface ServiceControllerProps {
  services: Record<ServiceId, ServiceConfig>;
  onUpdateService: (id: ServiceId, updates: Partial<ServiceConfig>) => Promise<void>;
  onResetAll: () => Promise<void>;
  isResetting: boolean;
}

export default function ServiceController({
  services,
  onUpdateService,
  onResetAll,
  isResetting
}: ServiceControllerProps) {

  const handleStatusChange = (id: ServiceId, status: 'online' | 'degraded' | 'offline') => {
    onUpdateService(id, { status });
  };

  const handleLatencyChange = (id: ServiceId, val: number) => {
    onUpdateService(id, { latencyMs: val });
  };

  const handleFailureRateChange = (id: ServiceId, val: number) => {
    onUpdateService(id, { failureRate: val });
  };

  return (
    <div id="service-control-panel" className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-2xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Chaos Engineering & Cluster Controller</h2>
          </div>
          <button
            onClick={onResetAll}
            disabled={isResetting}
            className="text-[10px] font-bold text-rose-400 bg-rose-950/25 hover:bg-rose-900/35 border border-rose-900/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Cluster State
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Tweak latency, trigger network faults, or pull services offline. Perform live transactions in the portal on the left to see how the system behaves, routes errors, or guarantees eventual consistency.
        </p>

        {/* Services Control Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
          {Object.values(services).map((svc) => {
            const hasAlteredSettings = svc.status !== 'online' || svc.latencyMs > 50 || svc.failureRate > 0;

            return (
              <div 
                key={svc.id} 
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  svc.status === 'offline' 
                    ? 'bg-rose-950/10 border-rose-900/40' 
                    : svc.status === 'degraded'
                    ? 'bg-amber-950/10 border-amber-900/40'
                    : hasAlteredSettings
                    ? 'bg-slate-850 border-slate-700/80'
                    : 'bg-slate-950 border-slate-850'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-200">{svc.name}</h4>
                    <span className="font-mono text-[8px] text-slate-500 uppercase">{svc.id} node</span>
                  </div>
                  {svc.status === 'degraded' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  {svc.status === 'offline' && (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                </div>

                {/* Status Toggle buttons */}
                <div className="grid grid-cols-3 gap-1 mb-2.5">
                  <button
                    onClick={() => handleStatusChange(svc.id, 'online')}
                    className={`py-1 text-[9px] font-bold rounded transition cursor-pointer ${
                      svc.status === 'online'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900 border border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => handleStatusChange(svc.id, 'degraded')}
                    className={`py-1 text-[9px] font-bold rounded transition cursor-pointer ${
                      svc.status === 'degraded'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        : 'bg-slate-900 border border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Degrade
                  </button>
                  <button
                    onClick={() => handleStatusChange(svc.id, 'offline')}
                    className={`py-1 text-[9px] font-bold rounded transition cursor-pointer ${
                      svc.status === 'offline'
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        : 'bg-slate-900 border border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Offline
                  </button>
                </div>

                {/* Sliders for latency & failure rate */}
                <div className="space-y-2">
                  {/* Latency */}
                  <div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                      <span>Network Latency</span>
                      <span className={svc.latencyMs > 100 ? 'text-amber-400 font-bold' : ''}>
                        {svc.latencyMs} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={svc.latencyMs}
                      onChange={(e) => handleLatencyChange(svc.id, Number(e.target.value))}
                      disabled={svc.status === 'offline'}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Failure Injection */}
                  <div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                      <span>Injected Error Rate</span>
                      <span className={svc.failureRate > 0 ? 'text-rose-400 font-bold' : ''}>
                        {svc.failureRate} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={svc.failureRate}
                      onChange={(e) => handleFailureRateChange(svc.id, Number(e.target.value))}
                      disabled={svc.status === 'offline'}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cluster Simulation Scenarios */}
      <div className="mt-4 border-t border-slate-850 pt-3 text-[11px]">
        <span className="font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">Interactive PoC Sandbox Scenarios</span>
        <div className="grid grid-cols-2 gap-2 text-slate-300">
          <button
            onClick={() => {
              // Apply Scenario: High latency on Loans Service
              onUpdateService('loans', { status: 'degraded', latencyMs: 650, failureRate: 0 });
              onUpdateService('broker', { status: 'online', latencyMs: 10, failureRate: 0 });
              onUpdateService('notifications', { status: 'online', latencyMs: 20, failureRate: 0 });
            }}
            className="p-1.5 text-left rounded-lg bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:bg-slate-900 transition flex flex-col justify-between cursor-pointer"
          >
            <span className="font-semibold text-slate-200">🐢 Heavy Loan Load</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Loans node latency reaches 650ms. Rest remains nominal.</span>
          </button>

          <button
            onClick={() => {
              // Apply Scenario: Notifications service Down, Event Broker buffering
              onUpdateService('notifications', { status: 'offline', latencyMs: 20, failureRate: 0 });
              onUpdateService('broker', { status: 'online', latencyMs: 30, failureRate: 0 });
              onUpdateService('transactions', { status: 'online', latencyMs: 40, failureRate: 0 });
            }}
            className="p-1.5 text-left rounded-lg bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:bg-slate-900 transition flex flex-col justify-between cursor-pointer"
          >
            <span className="font-semibold text-slate-200">📬 Eventual Consistency</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Notification goes OFFLINE. Event Broker queues logs.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
