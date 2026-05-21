"use client";

import React, { useState, useEffect } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge, Button } from "@/components/admin/ui/Core";
import { DatabaseIcon, CloudIcon, CheckCircleIcon, XCircleIcon, ClockIcon, AlertCircleIcon } from "@/components/admin/Icons";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import { apiFetch } from "@/lib/api";

interface BackupJob {
  id: string;
  db_connection_id: string;
  triggered_by: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  file_name: string;
  file_size_bytes: number;
  gdrive_file_id: string;
  gdrive_file_url: string;
  error_message: string;
  database_connection?: {
    label: string;
    db_type: string;
    server?: {
      label: string;
    }
  }
}

export default function BackupHistoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedError, setSelectedError] = useState<{ open: boolean, message: string }>({
    open: false,
    message: ""
  });

  // Auto-refresh every 10 seconds to track progress
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const columns = [
    { 
      header: "Database / Server", 
      accessor: (item: BackupJob) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
            <DatabaseIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block">{item.database_connection?.label || 'Deleted DB'}</span>
            <span className="text-[10px] text-slate-500">{item.database_connection?.server?.label || 'Unknown Server'}</span>
          </div>
        </div>
      )
    },
    { 
      header: "Status", 
      accessor: (item: BackupJob) => {
        const variants: any = {
          success: "success",
          failed: "danger",
          running: "neutral",
          pending: "neutral"
        };
        return (
          <Badge variant={variants[item.status] || "neutral"}>
            {item.status.toUpperCase()}
          </Badge>
        );
      }
    },
    { 
      header: "File Details", 
      accessor: (item: BackupJob) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-300 font-mono truncate max-w-[200px]">{item.file_name || '-'}</p>
          <p className="text-[10px] text-slate-500">{formatSize(item.file_size_bytes)}</p>
        </div>
      )
    },
    { 
      header: "Timing", 
      accessor: (item: BackupJob) => (
        <div className="text-xs text-slate-400">
          <p>{item.started_at ? new Date(item.started_at).toLocaleString() : '-'}</p>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {item.duration_seconds ? `${item.duration_seconds}s` : '-'}
          </p>
        </div>
      )
    },
    {
      header: "Actions",
      accessor: (item: BackupJob) => (
        <div className="flex justify-end gap-1">
          {item.status === 'success' && item.gdrive_file_url && (
            <Button
              variant="ghost"
              size="sm"
              title="Open in Drive"
              className="text-emerald-400 hover:text-emerald-300 px-2"
              onClick={() => window.open(item.gdrive_file_url, '_blank')}
            >
              <CloudIcon className="h-3.5 w-3.5" />
            </Button>
          )}
          {item.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              title="View error logs"
              className="text-rose-400 hover:text-rose-300 px-2"
              onClick={() => setSelectedError({ open: true, message: item.error_message })}
            >
              <AlertCircleIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
      align: "right" as const
    }
  ];

  return (
    <div className="space-y-6">
      <AlertDialog 
        isOpen={selectedError.open}
        onClose={() => setSelectedError({ ...selectedError, open: false })}
        title="Backup Failure Logs"
        description={selectedError.message}
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Backup History</h1>
          <p className="text-sm text-slate-400 mt-1">Review and manage your archive repository status.</p>
        </div>
        <Button variant="ghost" onClick={() => setRefreshKey(prev => prev + 1)} className="text-slate-400">
          REFRESH
        </Button>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<BackupJob> 
          fetchUrl="/backups" 
          columns={columns} 
          searchPlaceholder="Search history..." 
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
