"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MenuIcon, SearchIcon, BellIcon, PlusIcon, ServerIcon, DatabaseIcon } from "./Icons";
import { GlobalSearch } from "./GlobalSearch";
import { apiFetch } from "@/lib/api";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sysStatus, setSysStatus] = useState<"OPTIMAL" | "WARNING" | "ERROR">("OPTIMAL");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiFetch("/servers");
        
        if (res.ok) {
          const data = await res.json();
          const servers = data.data?.data || data.data || [];
          const hasOffline = servers.some((s: any) => !s.is_active);
          setSysStatus(hasOffline ? "WARNING" : "OPTIMAL");
        } else {
          setSysStatus("ERROR");
        }
      } catch (err) {
        setSysStatus("ERROR");
      }
    };
    fetchHealth();
    // Refresh health every 60 seconds
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-md px-4 md:px-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 text-slate-400 hover:text-emerald-400"
          >
            <MenuIcon />
          </button>
          <div className="relative hidden lg:block" onClick={() => setIsSearchOpen(true)}>
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="text"
              readOnly
              placeholder="Search resources, vaults, logs... (Cmd+K)"
              className="w-80 rounded-lg bg-slate-800/50 border border-slate-700/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all hover:bg-slate-800 hover:border-emerald-500/50 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-[11px] font-mono ${sysStatus === 'OPTIMAL' ? 'text-emerald-400' : sysStatus === 'WARNING' ? 'text-amber-400' : 'text-rose-400'}`}>
          <span className={`h-2 w-2 rounded-full ${sysStatus === 'OPTIMAL' ? 'bg-emerald-500' : sysStatus === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
          SYS-STATUS: {sysStatus}
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
        </button>
        
        <div className="h-6 w-px bg-slate-800"></div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Entry</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-2 space-y-1">
                <Link href="/admin/servers/new" onClick={() => setIsDropdownOpen(false)}>
                  <span className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer">
                    <ServerIcon className="h-4 w-4" />
                    Register New Server
                  </span>
                </Link>
                <Link href="/admin/vault/new" onClick={() => setIsDropdownOpen(false)}>
                  <span className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer">
                    <DatabaseIcon className="h-4 w-4" />
                    Add Database Credential
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
