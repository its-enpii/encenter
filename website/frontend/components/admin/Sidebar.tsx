"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboardIcon, 
  ServerIcon, 
  LayoutGridIcon,
  DatabaseIcon, 
  ActivityIcon, 
  SettingsIcon,
  ShieldCheckIcon,
  CloudIcon,
  ClockIcon,
  WebhookIcon,
  UserIcon
} from "./Icons";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarLink = ({ href, icon, label, active }: SidebarLinkProps) => (
  <Link 
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    }`}
  >
    <span className={`transition-transform duration-300 ${active ? "" : "group-hover:scale-110"}`}>
      {icon}
    </span>
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" width="40" height="40" />
            <span className="text-xl font-bold text-white tracking-tight italic">EnVault</span>
          </div>
          
          <button 
            onClick={() => setIsOpen && setIsOpen(false)}
            className="p-2 text-slate-500 hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4">Command Center</div>
          
          <div onClick={() => setIsOpen && setIsOpen(false)}>
            <SidebarLink href="/admin" icon={<LayoutDashboardIcon />} label="Dashboard" active={pathname === "/admin"} />
            <SidebarLink href="/admin/groups" icon={<LayoutGridIcon />} label="Server Groups" active={pathname === "/admin/groups"} />
            <SidebarLink href="/admin/servers" icon={<ServerIcon />} label="Managed Servers" active={pathname === "/admin/servers"} />
            <SidebarLink href="/admin/vault" icon={<DatabaseIcon />} label="Credential Vault" active={pathname === "/admin/vault"} />
            <SidebarLink href="/admin/backups" icon={<ClockIcon />} label="Backup History" active={pathname === "/admin/backups"} />
            <SidebarLink href="/admin/storage" icon={<CloudIcon />} label="Cloud Storage" active={pathname === "/admin/storage"} />
            <SidebarLink href="/admin/webhooks" icon={<WebhookIcon />} label="Webhooks" active={pathname === "/admin/webhooks"} />
            <SidebarLink href="/admin/audit" icon={<ActivityIcon />} label="Audit Logs" active={pathname === "/admin/audit"} />
            <SidebarLink href="/admin/settings" icon={<SettingsIcon />} label="System Settings" active={pathname === "/admin/settings"} />
            <SidebarLink href="/admin/profile" icon={<UserIcon />} label="Profile" active={pathname === "/admin/profile"} />
          </div>
        </nav>

        <div className="p-6">
          <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Administrator</p>
                <p className="text-[10px] text-slate-500 truncate">Cyber Sentinel v1.0</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
