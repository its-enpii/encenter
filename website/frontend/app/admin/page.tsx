"use client";

import React, { useState, useEffect } from "react";
import { StatsCard } from "@/components/admin/StatsCard";
import { ServerFleet } from "@/components/admin/ServerFleet";
import { AuditLog } from "@/components/admin/AuditLog";
import { apiFetch } from "@/lib/api";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    servers: 0,
    databases: 0,
    backups: 0,
  });
  const [servers, setServers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [serversRes, auditRes, dbRes, backupsRes] = await Promise.all([
          apiFetch("/servers"),
          apiFetch("/audit-logs?per_page=10"),
          apiFetch("/database-connections"),
          apiFetch("/backups")
        ]);

        const serversData = await serversRes.json();
        const auditData = await auditRes.json();
        const dbData = await dbRes.json();
        const backupsData = await backupsRes.json();

        // Map Servers to ServerFleet format
        const mappedServers = (serversData.data?.data || serversData.data || []).map((s: any) => ({
          name: s.label,
          status: s.is_active ? "Active" : "Idle",
          ip: s.host,
          load: "N/A", // Not implemented yet
          sync: s.last_connected ? new Date(s.last_connected).toLocaleTimeString() : "Never",
        }));
        setServers(mappedServers.slice(0, 5));

        // Map Audit Logs
        const mappedLogs = (auditData.data?.data || auditData.data || []).map((log: any) => {
          const actionStr = (log.action || "").toLowerCase();
          return {
            type: actionStr.includes('fail') || actionStr.includes('error') ? 'error' 
                : actionStr.includes('warn') ? 'warning' 
                : 'success',
            title: log.action || 'Unknown Action',
            user: log.user?.name || log.ip_address || 'System',
            time: new Date(log.created_at).toLocaleString(),
          };
        });
        setAuditLogs(mappedLogs);

        // Map Stats
        setStats({
          servers: serversData.data?.total || serversData.data?.length || 0,
          databases: dbData.data?.total || dbData.data?.length || 0,
          backups: backupsData.data?.total || backupsData.data?.length || 0,
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Telemetry...</p>
        </div>
      </div>
    );
  }

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
          title="Active Servers"
          value={stats.servers.toString()}
          description="Managed Nodes"
          trend="neutral"
          trendValue="STABLE"
        />
        <StatsCard
          title="Database Connections"
          value={stats.databases.toString()}
          description="Total stored credentials"
          trend="neutral"
          trendValue="SECURE"
        />
        <StatsCard
          title="Total Backups"
          value={stats.backups.toString()}
          description="Cloud archives"
          trend="up"
          trendValue="SYNCING"
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
