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
    title={label}
    className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
      active
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 font-semibold"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
    }`}
  >
    <span className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}>
      {icon}
    </span>
    {/* Floating Tooltip */}
    <span className="absolute left-14 px-2.5 py-1 text-[11px] font-semibold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {label}
    </span>
  </Link>
);

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (val: boolean) => void }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { href: "/admin", icon: <LayoutDashboardIcon />, label: "Dashboard" },
    { href: "/admin/connect", icon: <TerminalIcon />, label: "SSH & SFTP" },
    { href: "/admin/servers", icon: <ServerIcon />, label: "Managed Servers" },
    { href: "/admin/vault", icon: <DatabaseIcon />, label: "Credential Vault" },
    { href: "/admin/backups", icon: <ClockIcon />, label: "Backup History" },
    { href: "/admin/storage", icon: <CloudIcon />, label: "Cloud Storage" },
    { href: "/admin/webhooks", icon: <WebhookIcon />, label: "Webhooks" },
    { href: "/admin/audit", icon: <ActivityIcon />, label: "Audit Logs" },
    { href: "/admin/help", icon: <HelpCircleIcon />, label: "User Guide" },
    { href: "/admin/settings", icon: <SettingsIcon />, label: "Settings" },
    { href: "/admin/profile", icon: <UserIcon />, label: "Profile" },
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

      {/* Mini Sidebar Container (Fixed w-16) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen w-16 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header / Logo Icon */}
        <div className="h-20 flex items-center justify-center border-b border-slate-800/60">
          <Link href="/admin" className="flex items-center justify-center">
            <img src="/logo.png" alt="Logo" width="36" height="36" className="min-w-9 min-h-9" />
          </Link>
        </div>

        {/* Navigation Icon List */}
        <nav className="flex-1 py-4 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const isActive =
              item.href === "/admin/help"
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
        </nav>

        {/* User Profile / Footer Section (Icon only with Tooltip & Sign out) */}
        <div className="py-3 flex flex-col items-center border-t border-slate-800/60">
          <div className="group relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => logout()}
              title={`Sign out (${user?.name ?? "Operator"})`}
              className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all"
            >
              <UserIcon className="h-4 w-4" />
            </button>
            <span className="absolute left-14 bottom-1 px-2.5 py-1 text-[11px] font-semibold text-rose-300 bg-slate-900 border border-slate-700/80 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Sign out ({user?.name ?? "Operator"})
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
