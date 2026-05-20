"use client";

import React from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge } from "@/components/admin/ui/Core";
import { ActivityLog } from "@/types/admin";

export default function AuditLogsPage() {
  const columns = [
    { 
      header: "Timestamp", 
      accessor: "created_at" as const, 
      className: "font-mono text-[10px] text-slate-500 w-48" 
    },
    { 
      header: "Action", 
      accessor: (item: ActivityLog) => {
        const variants: Record<string, "info" | "warning" | "error" | "success" | "neutral"> = {
          'REGISTER': 'info',
          'UPDATE': 'warning',
          'DELETE': 'error',
          'VAULT_ADD': 'success',
          'VAULT_UPDATE': 'warning',
          'VAULT_DELETE': 'error',
          'TEST_CONNECTION': 'info',
        };
        return <Badge variant={variants[item.action] || 'neutral'}>{item.action.replace('_', ' ')}</Badge>;
      }
    },
    { 
      header: "Resource", 
      accessor: (item: ActivityLog) => (
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-300">
            {item.resource} <span className="text-slate-600 font-normal">({item.resource_id?.slice(0, 8)})</span>
          </div>
          {!!item.meta?.label && (
            <div className="text-[10px] text-slate-500 italic">
              Target: {String(item.meta.label)}
            </div>
          )}
        </div>
      )
    },
    { 
      header: "Operator", 
      accessor: (item: ActivityLog) => (
        <span className="text-xs text-slate-400">{item.user?.email || 'System'}</span>
      )
    },
    { 
      header: "IP Address", 
      accessor: "ip_address" as const, 
      className: "font-mono text-[10px] text-slate-500",
      align: "right" as const
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Audit Logs</h1>
        <p className="text-sm text-slate-400 mt-1">Immutable record of all sensitive operations within the vault.</p>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<ActivityLog> 
          fetchUrl="/audit-logs" 
          columns={columns} 
          searchPlaceholder="Filter logs by action or resource..." 
        />
      </div>
    </div>
  );
}
