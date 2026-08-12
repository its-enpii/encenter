"use client";

import React from "react";
import { CpuIcon, MemoryIcon, ActivityIcon } from "@/components/admin/Icons";
import { Button } from "@/components/admin/ui/Core";

interface ServerDashboardViewProps {
  systemMetrics: {
    kernel?: string;
    uptime?: string;
    memory?: string;
    disk?: string;
  } | null;
  runningDiag: string | null;
  diagOutput: { title: string; output: string } | null;
  onRunDiagnostic: (title: string, cmd: string) => void;
  onClearDiagOutput: () => void;
}

export function ServerDashboardView({
  systemMetrics,
  runningDiag,
  diagOutput,
  onRunDiagnostic,
  onClearDiagOutput,
}: ServerDashboardViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kernel & Uptime Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CpuIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">System Kernel & Uptime</h3>
              <p className="text-[11px] text-slate-400">Remote Linux environment specs</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold mb-1">
                OS Kernel:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-emerald-300">
                {systemMetrics?.kernel || (
                  <span className="text-slate-500 italic">Click 'Establish Handshake' to load metrics</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold mb-1">
                System Uptime & Load:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-300">
                {systemMetrics?.uptime || <span className="text-slate-500 italic">N/A</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Memory & Disk Overview Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <MemoryIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Memory & Disk Overview</h3>
              <p className="text-[11px] text-slate-400">Storage & RAM utilization</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold mb-1">
                Root Filesystem (df -h /):
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-sky-300">
                {systemMetrics?.disk || <span className="text-slate-500 italic">N/A</span>}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold mb-1">
                Memory Usage (free -h):
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-purple-300">
                {systemMetrics?.memory || <span className="text-slate-500 italic">N/A</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Operational Diagnostics */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ActivityIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Quick Operational Diagnostics</h3>
              <p className="text-[11px] text-slate-400">Execute automated health checks on node</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("Check Memory", "free -m")}
            isLoading={runningDiag === "Check Memory"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            Check Memory (free -m)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("Check Disk Space", "df -h")}
            isLoading={runningDiag === "Check Disk Space"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            Check Disk Space (df -h)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("List Running Containers", "docker ps")}
            isLoading={runningDiag === "List Running Containers"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            List Containers (docker ps)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("System Service Status", "systemctl status")}
            isLoading={runningDiag === "System Service Status"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            System Services (systemctl)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("Active Ports", "netstat -tuln")}
            isLoading={runningDiag === "Active Ports"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            Active Ports (netstat -tuln)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunDiagnostic("Top 5 CPU Processes", "ps aux --sort=-%cpu | head -n 6")}
            isLoading={runningDiag === "Top 5 CPU Processes"}
            className="text-xs justify-start border-slate-800 hover:border-emerald-500/40"
          >
            Top 5 CPU Processes (ps aux)
          </Button>
        </div>

        {/* Diagnostic Command Output Box */}
        {diagOutput && (
          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px] font-sans font-bold text-slate-300">
              <span>Diagnostic Result: {diagOutput.title}</span>
              <button
                onClick={onClearDiagOutput}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{diagOutput.output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
