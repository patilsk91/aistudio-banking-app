import React, { useState } from 'react';
import { TraceLog, TraceHop } from '../types';
import { Terminal, Clock, CornerDownRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface TraceViewerProps {
  traces: TraceLog[];
  selectedTrace: TraceLog | null;
  onSelectTrace: (trace: TraceLog | null) => void;
}

export default function TraceViewer({
  traces,
  selectedTrace,
  onSelectTrace
}: TraceViewerProps) {
  const [viewJson, setViewJson] = useState(false);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/20';
      case 'POST': return 'bg-sky-950/80 text-sky-400 border-sky-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30';
    if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-950/40 border-amber-800/30';
    return 'text-rose-400 bg-rose-950/40 border-rose-800/30';
  };

  const getHopStatusIcon = (status: 'success' | 'failed' | 'degraded') => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'degraded': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
    }
  };

  return (
    <div id="distributed-trace-dashboard" className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-2xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Jaeger / APM Distributed Traces</h2>
          </div>
          <span className="font-mono text-[9px] text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-full font-bold">
            Zipkin Compatible API
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Each user action traverses a chain of server nodes. Inspect latency budgets, analyze performance, and trace failures back to specific faulty nodes.
        </p>

        {/* Traces Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Left panel: Trace List */}
          <div className="lg:col-span-2 space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Distributed Trace Requests</label>
            {traces.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-850 rounded-xl text-xs text-slate-500">
                No telemetry traces recorded. Make a transaction above to generate data flow.
              </div>
            ) : (
              traces.map((trace) => {
                const isSelected = selectedTrace?.id === trace.id;
                return (
                  <button
                    key={trace.id}
                    onClick={() => {
                      onSelectTrace(isSelected ? null : trace);
                      setViewJson(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition duration-200 flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-950 border-slate-850 hover:bg-slate-900 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className={`px-1.5 py-0.5 font-bold font-mono rounded text-[9px] border ${getMethodColor(trace.method)}`}>
                          {trace.method}
                        </span>
                        <span className="font-mono text-slate-300 truncate max-w-[130px]" title={trace.path}>
                          {trace.path.replace('/api/gateway', '')}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] border ${getStatusColor(trace.status)}`}>
                        {trace.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="font-mono text-indigo-400 font-bold">{trace.totalDurationMs} ms</span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-500">
                        {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: Active Trace Details */}
          <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-850 p-4 min-h-[220px] flex flex-col justify-between">
            {selectedTrace ? (
              <div>
                <div className="flex items-start justify-between border-b border-slate-850 pb-2.5 mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      Trace Transaction Details
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {selectedTrace.id}</p>
                  </div>
                  <button
                    onClick={() => setViewJson(!viewJson)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/20 px-2.5 py-1.5 rounded-lg border border-indigo-900/30 cursor-pointer"
                  >
                    {viewJson ? 'View Span Timeline' : 'View OTEL JSON'}
                  </button>
                </div>

                {viewJson ? (
                  /* Raw JSON representation of trace spans */
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850 text-[10px] font-mono text-slate-300 max-h-[260px] overflow-y-auto overflow-x-auto select-text scrollbar-thin">
                    <pre>{JSON.stringify(selectedTrace, null, 2)}</pre>
                  </div>
                ) : (
                  /* gantt waterfall bar representation of hops */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Distributed Span Timeline Waterfall</label>
                      
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
                        {selectedTrace.hops.map((hop, index) => {
                          // Calculate widths/offsets of timelines
                          const totalDuration = selectedTrace.totalDurationMs || 1;
                          
                          // Estimate logical cumulative offsets for UI cascading representation
                          let priorDurationSum = 0;
                          for (let i = 0; i < index; i++) {
                            priorDurationSum += selectedTrace.hops[i].durationMs;
                          }
                          const offsetPercent = Math.min(85, Math.max(0, (priorDurationSum / totalDuration) * 100));
                          const widthPercent = Math.max(10, Math.min(100 - offsetPercent, (hop.durationMs / totalDuration) * 100));

                          return (
                            <div key={index} className="text-[10px] border-b border-slate-900/60 pb-2">
                              <div className="flex items-center justify-between text-slate-300 mb-1">
                                <div className="flex items-center gap-1 truncate max-w-[200px]">
                                  {index > 0 && <CornerDownRight className="w-3 h-3 text-indigo-500 shrink-0" />}
                                  <span className="font-bold text-indigo-300 font-mono text-[9.5px] uppercase">{hop.serviceId}</span>
                                  <span className="text-slate-400 text-[9px] truncate">- {hop.action}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-slate-400 font-bold">{hop.durationMs}ms</span>
                                  {getHopStatusIcon(hop.status)}
                                </div>
                              </div>

                              {/* Horizontal timeline bar */}
                              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden relative border border-slate-850">
                                <div
                                  style={{
                                    marginLeft: `${offsetPercent}%`,
                                    width: `${widthPercent}%`
                                  }}
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    hop.status === 'failed' 
                                      ? 'bg-gradient-to-r from-rose-600 to-rose-400' 
                                      : hop.status === 'degraded'
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                      : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                                  }`}
                                />
                              </div>
                              {hop.error && (
                                <p className="text-[9px] text-rose-400 font-mono font-medium mt-1 pl-4">
                                  ⚠️ Exception thrown: {hop.error}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 text-xs">
                <Clock className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                <p>Select a recorded trace in the left sidebar to analyze hop latencies and trace structural calls.</p>
              </div>
            )}

            {/* Microservice Flow Legend info */}
            {selectedTrace && (
              <div className="border-t border-slate-850 pt-2 text-[9px] text-slate-500 font-medium flex items-center justify-between">
                <span>Total Round-Trip Budget: <b>{selectedTrace.totalDurationMs} ms</b></span>
                <span className="text-indigo-400">APM Health: Nominal</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
