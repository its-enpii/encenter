import React from "react";

interface AuditLogEntry {
  type: 'success' | 'warning' | 'error';
  title: string;
  user: string;
  time: string;
}

export function AuditLog({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-2xl flex flex-col h-full">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-lg font-bold text-white">Security Audit</h2>
        <p className="text-xs text-slate-500 mt-1">Latest encrypted transactions</p>
      </div>
      <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[400px]">
        {logs.map((log, index) => (
          <AuditItem key={index} {...log} />
        ))}
      </div>
      <div className="p-4 bg-slate-950/30 text-center border-t border-slate-800">
        <button className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
          Download Full Audit Report
        </button>
      </div>
    </div>
  );
}

function AuditItem({ type, title, user, time }: AuditLogEntry) {
  return (
    <div className="flex gap-4 group">
      <div className={`mt-1 h-8 w-1 flex-shrink-0 rounded-full bg-slate-800 group-hover:bg-opacity-100 transition-colors ${
        type === 'success' ? 'group-hover:bg-emerald-500' : 
        type === 'warning' ? 'group-hover:bg-amber-500' : 'group-hover:bg-rose-500'
      }`}></div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-bold text-slate-200 group-hover:text-white transition-colors">{title}</h4>
          <span className="text-[10px] font-mono text-slate-500">{time}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500">INITIATOR:</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{user}</span>
        </div>
      </div>
    </div>
  );
}
