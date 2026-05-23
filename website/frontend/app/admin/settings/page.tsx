"use client";

import React, { useEffect, useState } from "react";
import { SettingsIcon, ActivityIcon } from "@/components/admin/Icons";
import { apiFetch } from "@/lib/api";

interface UserInfo {
  email?: string;
  name?: string;
  last_login?: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage global application configurations and system preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Settings Card */}
        <div className="lg:col-span-2 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <SettingsIcon className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">General Configuration</h2>
          </div>

          <div className="flex flex-col gap-4 text-sm text-slate-400">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col gap-1">
              <span className="text-white font-medium">Coming Soon</span>
              <span className="text-slate-500">Global system parameters are currently managed via environment variables. In-app configuration options will be available in future updates.</span>
            </div>
          </div>
        </div>

        {/* Active Session Card */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ActivityIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Active Session</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-sm text-slate-500">Operator</span>
              <span className="text-sm text-white truncate max-w-[55%]">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm text-white truncate max-w-[55%]" title={user?.email}>{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-sm text-slate-500">Last login</span>
              <span className="text-sm text-white">
                {user?.last_login ? new Date(user.last_login).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
