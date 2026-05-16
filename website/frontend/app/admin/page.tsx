import React from "react";
import { StatsCard } from "@/components/admin/StatsCard";
import { ServerFleet } from "@/components/admin/ServerFleet";
import { AuditLog } from "@/components/admin/AuditLog";

export default function AdminDashboard() {
  const servers = [
    {
      name: "PROD-WEB-01",
      status: "Active" as const,
      ip: "192.168.1.104",
      load: "12%",
      sync: "2m ago",
    },
    {
      name: "PROD-DB-PRIMARY",
      status: "Active" as const,
      ip: "10.0.4.12",
      load: "45%",
      sync: "5s ago",
    },
    {
      name: "BACKUP-GDRIVE-NODE",
      status: "Idle" as const,
      ip: "10.0.5.50",
      load: "2%",
      sync: "12h ago",
    },
    {
      name: "DEV-STAGING-01",
      status: "Active" as const,
      ip: "192.168.2.11",
      load: "18%",
      sync: "1h ago",
    },
    {
      name: "AUTH-VAULT-MIRROR",
      status: "Warning" as const,
      ip: "172.16.0.4",
      load: "89%",
      sync: "Now",
    },
  ];

  const auditLogs = [
    {
      type: "success" as const,
      title: "Credential Decrypted",
      user: "admin_root",
      time: "14:22:05",
    },
    {
      type: "warning" as const,
      title: "New SSH Tunnel",
      user: "system_bot",
      time: "13:10:44",
    },
    {
      type: "error" as const,
      title: "Failed Login Attempt",
      user: "124.55.xx.xx",
      time: "12:05:12",
    },
    {
      type: "success" as const,
      title: "Database Backup",
      user: "backup_worker",
      time: "04:00:01",
    },
    {
      type: "success" as const,
      title: "Vault Key Rotated",
      user: "admin_root",
      time: "Yesterday",
    },
    {
      type: "warning" as const,
      title: "Large File Upload",
      user: "backup_worker",
      time: "Yesterday",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          Control Center
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20">
            SECURE-LIVE
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Unified management interface for server fleet, encrypted credentials,
          and automated recovery pipelines.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Vault Security Score"
          value="98.4%"
          description="Encryption Level: AES-256"
          trend="up"
          trendValue="+0.2%"
        />
        <StatsCard
          title="Active Tunnels"
          value="14/15"
          description="SSH Tunnels Established"
          trend="neutral"
          trendValue="STABLE"
        />
        <StatsCard
          title="Encrypted Secrets"
          value="1,248"
          description="Total stored credentials"
          trend="up"
          trendValue="+12"
        />
        <StatsCard
          title="Backup Success"
          value="100%"
          description="Last 24 hours"
          trend="neutral"
          trendValue="PERFECT"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServerFleet servers={servers} />
        </div>
        <div>
          <AuditLog logs={auditLogs} />
        </div>
      </div>
    </div>
  );
}
