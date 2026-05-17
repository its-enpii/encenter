"use client";

import React, { useState, useEffect, useRef } from "react";
import { BellIcon } from "./Icons";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnreadError, setHasUnreadError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch("/audit-logs");
        if (res.ok) {
          const data = await res.json();
          const logs = data.data?.data || data.data || [];
          
          // Map to notifications
          const mappedLogs = logs.slice(0, 5).map((log: any) => {
            const actionStr = (log.action || "").toLowerCase();
            return {
              id: log.id,
              type: actionStr.includes('fail') || actionStr.includes('error') ? 'error' 
                  : actionStr.includes('warn') ? 'warning' 
                  : 'info',
              title: log.action || 'System Alert',
              message: log.user?.name ? `Initiated by ${log.user.name}` : `IP: ${log.ip_address}`,
              time: new Date(log.created_at).toLocaleString(),
            };
          });

          setNotifications(mappedLogs);
          // Highlight if there is any recent error/fail
          setHasUnreadError(mappedLogs.some((l: any) => l.type === 'error' || l.type === 'warning'));
        }
      } catch (err) {
        console.error("Failed to fetch notifications");
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <BellIcon className="h-5 w-5" />
        {hasUnreadError && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-slate-900 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-slate-200 text-sm">Recent Activity</h3>
            <Link href="/admin/logs" onClick={() => setIsOpen(false)} className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300">
              View All
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${
                        notif.type === 'error' ? 'text-rose-400' : 
                        notif.type === 'warning' ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        {notif.title.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-2">{notif.time}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-slate-500">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
