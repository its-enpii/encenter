"use client";

import React, { useState } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge, Button } from "@/components/admin/ui/Core";
import { PlusIcon, DatabaseIcon, ServerIcon, PlayIcon, CloudIcon } from "@/components/admin/Icons";
import { DatabaseConnection } from "@/types/admin";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function VaultPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [testResult, setTestResult] = useState<{ open: boolean, title: string, message: string, variant: "success" | "danger" }>({
    open: false,
    title: "",
    message: "",
    variant: "success"
  });
  
  // Separate loading states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [backingUpId, setBackingUpId] = useState<string | null>(null);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const response = await apiFetch(`/database-connections/${id}/test`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setTestResult({
          open: true,
          title: "Handshake Successful",
          message: `${data.message} Latency: ${data.latency}`,
          variant: "success"
        });
        setRefreshKey(prev => prev + 1);
      } else {
        setTestResult({
          open: true,
          title: "Handshake Failed",
          message: data.message || "The database server refused the connection attempt.",
          variant: "danger"
        });
      }
    } catch (err) {
      setTestResult({
        open: true,
        title: "Link Failure",
        message: "Failed to communicate with the vault gateway.",
        variant: "danger"
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleRunBackup = async (id: string) => {
    setBackingUpId(id);
    try {
      const response = await apiFetch(`/backups/run`, {
        method: "POST",
        body: JSON.stringify({ db_connection_id: id })
      });
      const data = await response.json();

      if (response.ok) {
        setTestResult({
          open: true,
          title: "Backup Initiated",
          message: "The backup engine has been dispatched. You can track its progress in the Backup History page.",
          variant: "success"
        });
      } else {
        throw new Error(data.message || "Failed to start backup");
      }
    } catch (err: any) {
      setTestResult({
        open: true,
        title: "Backup Failed",
        message: err.message || "Failed to communicate with the backup engine.",
        variant: "danger"
      });
    } finally {
      setBackingUpId(null);
    }
  };

  const handleOpenPma = (item: DatabaseConnection) => {
    // Buka phpMyAdmin via autologin.php dengan kredensial dari Vault
    const form = document.createElement("form");
    form.action = "http://localhost:8081/autologin.php";
    form.method = "POST";
    form.target = "_blank";

    const fields = {
      pma_username: item.db_username || "",
      pma_password: item.db_password || "",
      pma_servername: `${item.server?.host || item.db_host}:${item.db_port}`
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const columns = [
    { 
      header: "Database Label", 
      accessor: (item: DatabaseConnection) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-colors">
            <DatabaseIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block">{item.label}</span>
            <span className="text-[10px] text-slate-500 font-mono">{item.db_type.toUpperCase()}</span>
          </div>
        </div>
      )
    },
    { 
      header: "Associated Server", 
      accessor: (item: DatabaseConnection) => (
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <ServerIcon className="h-3 w-3" />
          {item.server?.label || 'Unknown'}
        </div>
      )
    },
    {
      header: "Target DB",
      accessor: (item: DatabaseConnection) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.db_name ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
          {item.db_name || 'ALL DATABASES'}
        </span>
      )
    },
    { header: "Endpoint", accessor: (item: DatabaseConnection) => `${item.db_host}:${item.db_port}`, className: "font-mono text-xs text-slate-400" },
    { 
      header: "Status", 
      accessor: (item: DatabaseConnection) => (
        <Badge variant={item.is_active ? 'success' : 'neutral'}>
          {item.is_active ? 'Linked' : 'Disconnected'}
        </Badge>
      )
    },
    {
      header: "Actions",
      accessor: (item: DatabaseConnection) => (
        <div className="flex justify-end gap-2">
          {(item.db_type === "mysql" || item.db_type === "mariadb") && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              onClick={() => handleOpenPma(item)}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              PMA
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-emerald-400 hover:text-emerald-300"
            onClick={() => handleTestConnection(item.id)}
            isLoading={testingId === item.id}
          >
            <PlayIcon className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
            onClick={() => handleRunBackup(item.id)}
            isLoading={backingUpId === item.id}
          >
            <CloudIcon className="h-3.5 w-3.5" />
            BACKUP
          </Button>
          <Link href={`/admin/vault/${item.id}`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
        </div>
      ),
      align: "right" as const
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credential Vault</h1>
          <p className="text-sm text-slate-400 mt-1">Manage encrypted database credentials and access keys.</p>
        </div>
        <Link href="/admin/vault/new">
          <Button variant="primary" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add DB Credential
          </Button>
        </Link>
      </div>

      <AlertDialog 
        isOpen={testResult.open}
        onClose={() => setTestResult({ ...testResult, open: false })}
        title={testResult.title}
        description={testResult.message}
        variant={testResult.variant}
      />
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<DatabaseConnection> 
          fetchUrl="/database-connections" 
          columns={columns} 
          searchPlaceholder="Search credentials by label or host..." 
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
