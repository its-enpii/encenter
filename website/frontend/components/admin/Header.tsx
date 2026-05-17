import React from "react";
import { MenuIcon, SearchIcon, BellIcon, PlusIcon } from "./Icons";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-md px-4 md:px-8">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-400 hover:text-emerald-400"
        >
          <MenuIcon />
        </button>
        <div className="relative hidden lg:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search resources, vaults, logs..."
            className="w-80 rounded-lg bg-slate-800/50 border border-slate-700/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:bg-slate-800 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-[11px] font-mono text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          SYS-STATUS: OPTIMAL
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
        </button>
        
        <div className="h-6 w-px bg-slate-800"></div>
        
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10">
          <PlusIcon className="h-4 w-4" />
          <span>New Entry</span>
        </button>
      </div>
    </header>
  );
}
