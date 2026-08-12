"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ServerIcon,
  DatabaseIcon,
  ActivityIcon,
  SettingsIcon,
  CloudIcon,
  ClockIcon,
  WebhookIcon,
  UserIcon,
  HelpCircleIcon,
  TerminalIcon,
} from "./Icons";
import { useAuth } from "@/lib/auth-context";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarLink = ({ href, icon, label, active, onClick }: SidebarLinkProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 px-3 py-2.5 w-full ${
      active
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 font-semibold"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
    }`}
  >
    <span className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}>
      {icon}
    </span>
    <span className="font-medium text-xs tracking-wide truncate">{label}</span>
  </Link>
);

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (val: boolean) => void }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuGroups = [
    {
      groupName: "Infrastructure",
      items: [
        { href: "/admin", icon: <LayoutDashboardIcon />, label: "Dashboard" },
        { href: "/admin/connect", icon: <TerminalIcon />, label: "SSH & SFTP" },
        { href: "/admin/servers", icon: <ServerIcon />, label: "Managed Servers" },
        { href: "/admin/vault", icon: <DatabaseIcon />, label: "Credential Vault" },
      ],
    },
    {
      groupName: "Pipelines & Storage",
      items: [
        { href: "/admin/backups", icon: <ClockIcon />, label: "Backup History" },
        { href: "/admin/storage", icon: <CloudIcon />, label: "Cloud Storage" },
        { href: "/admin/webhooks", icon: <WebhookIcon />, label: "Webhooks" },
      ],
    },
    {
      groupName: "System",
      items: [
        { href: "/admin/audit", icon: <ActivityIcon />, label: "Audit Logs" },
        { href: "/admin/help", icon: <HelpCircleIcon />, label: "User Guide" },
        { href: "/admin/settings", icon: <SettingsIcon />, label: "Settings" },
        { href: "/admin/profile", icon: <UserIcon />, label: "Profile" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-950/95 border-r border-slate-800/80 flex flex-col h-screen transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 ${
          isOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header / Logo */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60 h-20">
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden px-1">
            <img src="/logo.png" alt="Logo" width="36" height="36" className="min-w-9 min-h-9" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight italic leading-none">EnVault</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Control Center</span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen && setIsOpen(false)}
            className="p-2 text-slate-500 hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Group List */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Group Title Header */}
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                {group.groupName}
              </div>

              {/* Group Items */}
              {group.items.map((item) => {
                const isActive = item.href === "/admin/help" 
                  ? pathname.startsWith("/admin/help") 
                  : item.href === "/admin/connect"
                  ? pathname.startsWith("/admin/connect")
                  : pathname === item.href;
                  
                return (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive}
                    onClick={() => setIsOpen && setIsOpen(false)}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile / Footer Section */}
        <div className="p-3 border-t border-slate-800/60">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 min-w-8">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate" title={user?.name ?? "Operator"}>
                  {user?.name ?? "Operator"}
                </p>
                <p className="text-[10px] text-slate-500 truncate" title={user?.email ?? ""}>
                  {user?.email ?? ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors py-1.5 rounded-lg border border-slate-800 hover:border-rose-500/30"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
