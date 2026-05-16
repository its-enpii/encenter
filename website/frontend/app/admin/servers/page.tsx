"use client";

import React, { useState } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge, Button } from "@/components/admin/ui/Core";
import { PlusIcon, ServerIcon, PlayIcon } from "@/components/admin/Icons";
import { Server } from "@/types/admin";
import { ConfirmDialog, AlertDialog } from "@/components/admin/ui/Dialog";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function ServersPage() {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, serverId: string | null }>({ 
    open: false, 
    serverId: null 
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [testResult, setTestResult] = useState<{ open: boolean, title: string, message: string, variant: "success" | "danger" }>({
    open: false,
    title: "",
    message: "",
    variant: "success"
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteDialog.serverId) return;
    
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/servers/${deleteDialog.serverId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRefreshKey(prev => prev + 1);
        setDeleteDialog({ open: false, serverId: null });
      } else {
        alert("Failed to delete server node.");
      }
    } catch (err) {
      alert("Network error during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const response = await apiFetch(`/servers/${id}/test`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setTestResult({
          open: true,
          title: "Connection Successful",
          message: data.message || "The secure vault has established a handshake with the remote node.",
          variant: "success"
        });
        setRefreshKey(prev => prev + 1);
      } else {
        setTestResult({
          open: true,
          title: "Connection Failed",
          message: data.message || "The remote node refused the connection attempt.",
          variant: "danger"
        });
      }
    } catch (err) {
      setTestResult({
        open: true,
        title: "Network Error",
        message: "Failed to communicate with the encryption gateway.",
        variant: "danger"
      });
    } finally {
      setTestingId(null);
    }
  };

  const columns = [
    {
      header: "Node Label",
      accessor: (item: Server) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-colors">
            <ServerIcon className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-200">{item.label}</span>
        </div>
      ),
    },
    {
      header: "Host / IP",
      accessor: "host" as const,
      className: "font-mono text-xs",
    },
    {
      header: "Status",
      accessor: (item: Server) => (
        <Badge variant={item.is_active ? "success" : "neutral"}>
          {item.is_active ? "Online" : "Offline"}
        </Badge>
      ),
    },
    {
      header: "Group",
      accessor: (item: Server) =>
        item.group ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400">
            {item.group.name}
          </span>
        ) : (
          <span className="text-slate-600 italic text-[10px]">None</span>
        ),
    },
    {
      header: "Last Sync",
      accessor: (item: Server) => (
        <span className="font-mono text-[10px] text-slate-500">
          {item.last_connected || "Never"}
        </span>
      ),
      align: "right" as const,
    },
    {
      header: "Actions",
      accessor: (item: Server) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-emerald-400 hover:text-emerald-300"
            onClick={() => handleTestConnection(item.id)}
            isLoading={testingId === item.id}
          >
            <PlayIcon className="h-3.5 w-3.5" />
          </Button>
          <Link href={`/admin/servers/${item.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-400 hover:text-rose-300"
            onClick={() => setDeleteDialog({ open: true, serverId: item.id })}
          >
            Delete
          </Button>
        </div>
      ),
      align: "right" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <ConfirmDialog 
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, serverId: null })}
        onConfirm={handleDelete}
        title="Decommission Server Node?"
        description="This action will permanently remove the server and all linked database credentials from the vault."
        confirmText="Confirm Purge"
        isLoading={isDeleting}
      />
      <AlertDialog 
        isOpen={testResult.open}
        onClose={() => setTestResult({ ...testResult, open: false })}
        title={testResult.title}
        description={testResult.message}
        variant={testResult.variant}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Server Fleet</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your remote infrastructure and SSH credentials.
          </p>
        </div>
        <Link href="/admin/servers/new">
          <Button variant="primary" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Register New Node
          </Button>
        </Link>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<Server>
          fetchUrl="/servers" 
          columns={columns}
          searchPlaceholder="Search servers by label or IP..."
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
