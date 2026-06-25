import React, { useState } from 'react';
import { ServiceId, ServiceConfig, ServiceLog, BrokerMessage } from '../types';
import { Terminal, Cpu, Database, Eye, BellRing, Inbox, AlertTriangle } from 'lucide-react';

interface MetricsPanelProps {
  services: Record<ServiceId, ServiceConfig>;
  logs: ServiceLog[];
  brokerMessages: BrokerMessage[];
}

export default function MetricsPanel({
  services,
  logs,
  brokerMessages
}: MetricsPanelProps) {
  const [logFilter, setLogFilter] = useState<ServiceId | 'all'>('all');
  const [panelTab, setPanelTab] = useState<'logs' | 'broker' | 'telemetry'>('logs');

  const filteredLogs = logs.filter(l => logFilter === 'all' || l.serviceId === logFilter);

  const getLogLevelStyle = (level: 'info' | 'warn' | 'error') => {
    switch (level) {
      case 'info': return 'text-sky-400';
      case 'warn': return 'text-amber-400 font-semibold';
      case 'error': return 'text-rose-500 font-bold';
    }
  };

  const getServiceColor = (id: ServiceId) => {
    switch (id) {
      case 'gateway': return 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20';
      case 'auth': return 'text-teal-400 border-teal-500/20 bg-teal-950/20';
      case 'accounts': return 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20';
      case 'transactions': return 'text-purple-400 border-purple-500/20 bg-purple-950/20';
      case 'loans': return 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
      case 'broker': return 'text-amber-400 border-amber-500/20 bg-amber-950/20';
      case 'notifications': return 'text-pink-400 border-pink-500/20 bg-pink-950/20';
    }
  };

  return (
    <div id="telemetry-logs-broker-dashboard" className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-2xl h-full flex flex-col justify-between">
      <div>
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-850 pb-3 mb-4">
          <div className="flex flex-wrap gap-1 text-xs font-semibold">
            <button
              onClick={() => setPanelTab('logs')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                panelTab === 'logs'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Log Console
            </button>
            <button
              onClick={() => setPanelTab('broker')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                panelTab === 'broker'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" /> Event Broker (Kafka)
            </button>
            <button
              onClick={() => setPanelTab('telemetry')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                panelTab === 'telemetry'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Resources
            </button>
          </div>

          {/* Log Specific Filter Dropdown */}
          {panelTab === 'logs' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Filter Node:</span>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as ServiceId | 'all')}
                className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-300 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Services</option>
                {Object.values(services).map(svc => (
                  <option key={svc.id} value={svc.id}>{svc.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Console / Kafka / Resource Content Rendering */}
        {panelTab === 'logs' && (
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Live Server Container Output Stream</label>
            <div className="bg-black/85 font-mono text-[11px] rounded-2xl border border-slate-850 p-3 h-[320px] overflow-y-auto overflow-x-auto select-text scrollbar-thin flex flex-col-reverse">
              <div className="space-y-1">
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-20 italic">
                    ~ Waiting for cluster connection and events... ~
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="leading-5 hover:bg-slate-950/40 p-0.5 rounded transition">
                      <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={`px-1 rounded font-bold text-[9px] border inline-block min-w-[80px] text-center ${getServiceColor(log.serviceId)}`}>
                        {log.serviceId.toUpperCase()}
                      </span>{' '}
                      <span className={`font-semibold ${getLogLevelStyle(log.level)}`}>
                        [{log.level.toUpperCase()}]
                      </span>{' '}
                      {log.traceId && (
                        <span className="text-slate-500 font-medium">[{log.traceId}]</span>
                      )}{' '}
                      <span className="text-slate-300 font-medium select-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {panelTab === 'broker' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Kafka Event bus transaction topics</label>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <BellRing className="w-3 h-3 text-emerald-400" />
                <span>Asynchronous Consumer Connected</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-850 h-[320px] overflow-y-auto p-3 pr-1 scrollbar-thin">
              {brokerMessages.length === 0 ? (
                <div className="text-center py-24 text-slate-500 text-xs italic">
                  No queue events in partition broker. Transactions publish events automatically.
                </div>
              ) : (
                <div className="space-y-2">
                  {brokerMessages.map((msg) => (
                    <div key={msg.id} className="p-2.5 rounded-xl border border-slate-850 bg-slate-900 flex flex-col gap-1.5 transition hover:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="font-mono text-[10px] font-bold text-slate-200">Topic: {msg.topic}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold ${
                          msg.status === 'delivered'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/30'
                            : msg.status === 'failed'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/30'
                        }`}>
                          {msg.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Payload inspect */}
                      <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400">
                        <pre className="overflow-x-auto scrollbar-thin">{JSON.stringify(msg.payload, null, 2)}</pre>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-0.5">
                        <span>Event ID: {msg.id}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {panelTab === 'telemetry' && (
          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Service Container Virtual Allocations</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {Object.values(services).map((svc) => (
                <div key={svc.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-col gap-2 justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-200">{svc.name}</h4>
                      <span className="font-mono text-[8px] text-slate-500 uppercase">{svc.id}.service</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      svc.status === 'online'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/20'
                        : svc.status === 'degraded'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/20 animate-pulse'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/20'
                    }`}>
                      {svc.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    {/* CPU */}
                    <div>
                      <div className="flex justify-between font-mono text-slate-400 text-[9px] mb-0.5">
                        <span>CPU Usage</span>
                        <span className="font-bold text-slate-200">{svc.cpuUsage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                        <div
                          style={{ width: `${svc.cpuUsage}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            svc.cpuUsage > 75 
                              ? 'bg-rose-500 shadow-[0_0_5px_#f43f5e]' 
                              : svc.cpuUsage > 50
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Memory */}
                    <div>
                      <div className="flex justify-between font-mono text-slate-400 text-[9px] mb-0.5">
                        <span>Memory Bounds</span>
                        <span className="font-bold text-slate-200">{svc.memoryUsage} MB</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                        <div
                          style={{ width: `${Math.min(100, (svc.memoryUsage / 600) * 100)}%` }}
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                    <span>Inbound: <b>{svc.requestCount} r</b></span>
                    <span className="text-right text-rose-500">Errors: <b>{svc.errorCount}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-850 pt-2.5 text-[9px] text-slate-500 font-medium flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-indigo-500" />
          Virtual DB Engine: PostgreSQL Cluster
        </span>
        <span>Partition Factor: 3 Node Shards</span>
      </div>
    </div>
  );
}
