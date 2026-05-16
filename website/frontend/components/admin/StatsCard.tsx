import React from "react";
import { ShieldCheckIcon, LockIcon } from "./Icons";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}

export function StatsCard({ title, value, description, trend, trendValue }: StatsCardProps) {
  return (
    <div className="relative group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl transition-all hover:border-emerald-500/30 hover:bg-slate-900/60 overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {trend === 'up' ? <ShieldCheckIcon className="h-12 w-12 text-emerald-400" /> : <LockIcon className="h-12 w-12 text-emerald-400" />}
      </div>
      <div className="relative z-10">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
        <div className="mt-2 flex items-baseline gap-3">
          <p className="text-3xl font-bold text-white">{value}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 
            trend === 'down' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {trendValue}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 font-medium">{description}</p>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-500 transition-all duration-500 group-hover:w-full"></div>
    </div>
  );
}
