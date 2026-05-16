"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldIcon, 
  LayoutGridIcon, 
  LockIcon, 
  ServerIcon, 
  ActivityIcon, 
  SettingsIcon, 
  UserIcon 
} from "./Icons";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl md:flex">
      <div className="flex h-20 items-center px-6 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <ShieldIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">EnVault</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 py-6">
        <SidebarLink href="/admin" icon={<LayoutGridIcon />} label="Control Center" active={pathname === "/admin"} />
        <SidebarLink href="/admin/groups" icon={<LayoutGridIcon />} label="Server Groups" active={pathname === "/admin/groups"} />
        <SidebarLink href="/admin/servers" icon={<ServerIcon />} label="Server Fleet" active={pathname === "/admin/servers"} />
        <SidebarLink href="/admin/vault" icon={<LockIcon />} label="Credential Vault" active={pathname === "/admin/vault"} />
        <SidebarLink href="/admin/audit" icon={<ActivityIcon />} label="Audit Logs" active={pathname === "/admin/audit"} />
        <SidebarLink href="/admin/settings" icon={<SettingsIcon />} label="Security Settings" active={pathname === "/admin/settings"} />
      </nav>

      <div className="mt-auto p-4 border-t border-slate-800/50">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
          <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-white truncate">Administrator</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group ${
        active 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
      }`}
    >
      <span className={`transition-colors ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400"}`}>{icon}</span>
      {label}
    </Link>
  );
}
