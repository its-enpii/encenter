import React from "react";
import { ServerIcon } from "./Icons";

interface Server {
  name: string;
  status: 'Active' | 'Idle' | 'Warning';
  ip: string;
  load: string;
  sync: string;
}

export function ServerFleet({ servers }: { servers: Server[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Server Fleet</h2>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Real-time telemetry</span>
        </div>
        <button className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">MANAGE FLEET</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-950/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <th className="px-6 py-4">Node Identity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">IP Address</th>
              <th className="px-6 py-4">Load</th>
              <th className="px-6 py-4 text-right">Last Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {servers.map((server, index) => (
              <ServerRow key={index} {...server} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServerRow({ name, status, ip, load, sync }: Server) {
  const statusConfig = {
    'Active': { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    'Idle': { color: 'text-slate-400', bg: 'bg-slate-800' },
    'Warning': { color: 'text-amber-400', bg: 'bg-amber-500/20' },
  };

  const config = statusConfig[status] || statusConfig['Idle'];

  return (
    <tr className="hover:bg-slate-800/30 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-colors">
            <ServerIcon className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-200">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${config.color === 'text-emerald-400' ? 'bg-emerald-500 animate-pulse' : config.color === 'text-amber-400' ? 'bg-amber-500' : 'bg-slate-600'}`}></span>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${config.color}`}>{status}</span>
        </div>
      </td>
      <td className="px-6 py-4 font-mono text-xs text-slate-400">{ip}</td>
      <td className="px-6 py-4">
        <div className="w-24 bg-slate-800 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${parseInt(load) > 70 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: load }}></div>
        </div>
      </td>
      <td className="px-6 py-4 text-right text-xs font-mono text-slate-500">{sync}</td>
    </tr>
  );
}
