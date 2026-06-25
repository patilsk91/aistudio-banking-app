import React, { useMemo } from 'react';
import { ServiceId, ServiceConfig, TraceLog } from '../types';
import { Shield, Server, CreditCard, Send, Percent, Bell, Cpu } from 'lucide-react';

interface TopologyGraphProps {
  services: Record<ServiceId, ServiceConfig>;
  activeTrace: TraceLog | null;
  hoveredService: ServiceId | null;
  onHoverService: (id: ServiceId | null) => void;
}

interface NodePosition {
  id: ServiceId;
  label: string;
  x: number;
  y: number;
  icon: React.ComponentType<any>;
}

export default function TopologyGraph({
  services,
  activeTrace,
  hoveredService,
  onHoverService,
}: TopologyGraphProps) {
  // Coordinates for nodes in an 800x380 viewport
  const nodes: NodePosition[] = useMemo(() => [
    { id: 'gateway', label: 'API Gateway', x: 400, y: 50, icon: Cpu },
    { id: 'auth', label: 'Auth Service', x: 230, y: 130, icon: Shield },
    { id: 'accounts', label: 'Accounts DB Service', x: 230, y: 260, icon: Server },
    { id: 'loans', label: 'Loans Service', x: 570, y: 130, icon: Percent },
    { id: 'transactions', label: 'Transactions Service', x: 570, y: 260, icon: Send },
    { id: 'broker', label: 'Event Broker (Kafka)', x: 400, y: 340, icon: CreditCard },
    { id: 'notifications', label: 'Notifications Service', x: 700, y: 340, icon: Bell }
  ], []);

  // Map service connections (From -> To)
  const links = useMemo(() => [
    { from: 'gateway', to: 'auth', label: 'Proxy / Auth Check' },
    { from: 'gateway', to: 'accounts', label: 'Read Account List' },
    { from: 'gateway', to: 'loans', label: 'Apply Loan' },
    { from: 'gateway', to: 'transactions', label: 'P2P Transfer' },
    { from: 'auth', to: 'accounts', label: 'Validate Token' },
    { from: 'accounts', to: 'transactions', label: 'Sync Balances' },
    { from: 'transactions', to: 'accounts', label: 'Commit Ledger' },
    { from: 'loans', to: 'accounts', label: 'Fetch Profile' },
    { from: 'loans', to: 'transactions', label: 'Disburse Payout' },
    { from: 'accounts', to: 'broker', label: 'Publish Event' },
    { from: 'transactions', to: 'broker', label: 'Publish Event' },
    { from: 'loans', to: 'broker', label: 'Publish Event' },
    { from: 'broker', to: 'notifications', label: 'Consume Queue' }
  ], []);

  // Determine if a connection/link is currently "active" based on the selected trace
  const activeLinks = useMemo(() => {
    if (!activeTrace) return new Set<string>();
    const activeSet = new Set<string>();
    const hops = activeTrace.hops;
    
    for (let i = 0; i < hops.length; i++) {
      const currentHop = hops[i];
      const prevHop = i > 0 ? hops[i - 1] : null;
      
      if (prevHop) {
        // e.g. gateway -> auth, accounts -> broker, etc.
        activeSet.add(`${prevHop.serviceId}->${currentHop.serviceId}`);
      }
      
      // Also check specific standard flow links
      if (currentHop.serviceId === 'gateway') {
        activeSet.add('gateway->auth');
      }
      if (currentHop.serviceId === 'accounts' && activeTrace.path.includes('accounts')) {
        activeSet.add('gateway->accounts');
      }
      if (currentHop.serviceId === 'transactions') {
        activeSet.add('gateway->transactions');
        activeSet.add('transactions->accounts');
      }
      if (currentHop.serviceId === 'loans') {
        activeSet.add('gateway->loans');
        activeSet.add('loans->accounts');
      }
      if (activeTrace.status === 200) {
        activeSet.add('accounts->broker');
        activeSet.add('transactions->broker');
        activeSet.add('loans->broker');
        activeSet.add('broker->notifications');
      }
    }
    return activeSet;
  }, [activeTrace]);

  const getNodeColorClass = (status: 'online' | 'degraded' | 'offline') => {
    switch (status) {
      case 'online':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 ring-emerald-500/20',
          indicator: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
          text: 'text-emerald-400'
        };
      case 'degraded':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300 ring-amber-500/20',
          indicator: 'bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]',
          text: 'text-amber-400'
        };
      case 'offline':
        return {
          bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300 ring-rose-500/20',
          indicator: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
          text: 'text-rose-400'
        };
    }
  };

  return (
    <div id="service-topology-container" className="relative bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-x-auto scrollbar-thin shadow-xl select-none h-[420px]">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">System Service Topology</h3>
        <p className="text-[11px] text-slate-400">Interactive live microservices cluster configuration & dependency flows</p>
      </div>

      <div className="absolute top-4 right-4 flex gap-4 text-xs z-10 bg-slate-950/80 backdrop-blur-sm p-1 px-2.5 rounded-lg border border-slate-850">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span className="text-slate-400 font-mono text-[10px]">Online</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_#f59e0b]" />
          <span className="text-slate-400 font-mono text-[10px]">Degraded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
          <span className="text-slate-400 font-mono text-[10px]">Offline</span>
        </div>
      </div>

      <div className="relative w-full min-w-[800px] h-full mt-4">
        {/* Connection Links rendering via SVG */}
        <svg id="topology-svg" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            {/* Glowing particle filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {/* Draw all link lines */}
          {links.map((link, idx) => {
            const fromNode = nodes.find(n => n.id === link.from);
            const toNode = nodes.find(n => n.id === link.to);
            if (!fromNode || !toNode) return null;

            const isActive = activeLinks.has(`${link.from}->${link.to}`);
            const isSvcOffline = services[link.from as ServiceId].status === 'offline' || services[link.to as ServiceId].status === 'offline';

            return (
              <g key={idx} className="transition-all duration-300">
                {/* Core connection path */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isActive ? 'url(#activeGrad)' : isSvcOffline ? '#f43f5e22' : 'rgba(255, 255, 255, 0.08)'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeDasharray={isSvcOffline ? '4 4' : isActive ? 'none' : '5 5'}
                  className="transition-colors duration-300"
                />
                
                {/* Animated trace flowing particle if link is active */}
                {isActive && (
                  <circle r="4" fill="#06b6d4" filter="url(#glow)">
                    <animateMotion
                      dur="1.5s"
                      repeatCount="indefinite"
                      path={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Service Nodes rendering absolute layers */}
        <div className="absolute inset-0 w-full h-full">
          {nodes.map(node => {
            const config = services[node.id];
            const style = getNodeColorClass(config.status);
            const Icon = node.icon;
            const isHovered = hoveredService === node.id;
            const isTraced = activeTrace?.hops.some(h => h.serviceId === node.id);

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => onHoverService(node.id)}
                onMouseLeave={() => onHoverService(null)}
                className={`absolute flex flex-col items-center justify-center p-3 rounded-2xl border w-32 cursor-pointer select-none transition-all duration-300 ring-2 ${
                  isHovered 
                    ? 'scale-110 shadow-2xl border-indigo-400/80 bg-slate-900 ring-indigo-500/30' 
                    : isTraced
                    ? 'scale-105 shadow-lg ring-sky-500/30 bg-slate-900 border-sky-500/40'
                    : 'shadow-md border-slate-850 bg-slate-950/90 ring-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.indicator}`} />
                  <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{node.id}</span>
                </div>
                
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-850 mb-1">
                  <Icon className={`w-4 h-4 ${style.text}`} />
                </div>
                
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-200 truncate max-w-[110px]">{node.label}</p>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                    {config.status === 'offline' ? 'OFFLINE' : `${config.latencyMs}ms latency`}
                  </p>
                </div>

                {/* Little stats popup details on Hover */}
                {isHovered && (
                  <div className="absolute top-[102%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-2xl z-20 w-44 pointer-events-none text-left backdrop-blur-md">
                    <div className="text-[9px] font-mono font-bold text-slate-300 mb-1.5 border-b border-slate-800 pb-1">
                      {config.name.toUpperCase()}
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px]">
                      <span className="text-slate-500">RPS:</span>
                      <span className="text-slate-300 text-right font-semibold">
                        {Math.round(config.requestCount / 10 + Math.random())} r/s
                      </span>
                      <span className="text-slate-500">Errors:</span>
                      <span className="text-rose-400 text-right font-semibold">{config.errorCount}</span>
                      <span className="text-slate-500">CPU Usage:</span>
                      <span className="text-slate-300 text-right font-semibold">{config.cpuUsage}%</span>
                      <span className="text-slate-500">Mem Usage:</span>
                      <span className="text-slate-300 text-right font-semibold">{config.memoryUsage}MB</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
