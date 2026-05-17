"use client";

import React, { useState } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge, Button } from "@/components/admin/ui/Core";
import { PlusIcon, PlayIcon } from "@/components/admin/Icons";
import { WebhookSetting } from "@/types/admin";
import { ConfirmDialog, AlertDialog } from "@/components/admin/ui/Dialog";
import { apiFetch } from "@/lib/api";
import { WebhookDialog } from "./components/webhook-dialog";

export default function WebhooksPage() {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, id: string | null }>({ 
    open: false, 
    id: null 
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

  const [formDialog, setFormDialog] = useState<{ open: boolean, setting: WebhookSetting | null }>({
    open: false,
    setting: null
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/webhooks/${deleteDialog.id}`, {
        method: "DELETE",
      });

      if (response.ok || response.status === 204) {
        setRefreshKey(prev => prev + 1);
        setDeleteDialog({ open: false, id: null });
      } else {
        alert("Failed to delete webhook.");
      }
    } catch (err) {
      alert("Network error during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const response = await apiFetch(`/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          open: true,
          title: "Test Successful",
          message: `Received status ${data.status} from target server.`,
          variant: "success"
        });
      } else {
        setTestResult({
          open: true,
          title: "Test Failed",
          message: data.error || `Target server returned status ${data.status}.`,
          variant: "danger"
        });
      }
    } catch (err) {
      setTestResult({
        open: true,
        title: "Network Error",
        message: "Failed to communicate with API.",
        variant: "danger"
      });
    } finally {
      setTestingId(null);
    }
  };

  const columns = [
    {
      header: "Name",
      accessor: (item: WebhookSetting) => (
        <span className="font-bold text-slate-200">{item.name}</span>
      ),
    },
    {
      header: "URL",
      accessor: "webhook_url" as const,
      className: "font-mono text-xs max-w-[200px] truncate text-slate-400",
    },
    {
      header: "Status",
      accessor: (item: WebhookSetting) => (
        <Badge variant={item.is_active ? "success" : "neutral"}>
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Events",
      accessor: (item: WebhookSetting) => (
        <div className="flex gap-1 flex-wrap">
          {item.events?.map(event => (
            <span key={event} className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400">
              {event}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: (item: WebhookSetting) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-emerald-400 hover:text-emerald-300"
            onClick={() => handleTestWebhook(item.id)}
            isLoading={testingId === item.id}
            title="Send Test Payload"
          >
            <PlayIcon className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFormDialog({ open: true, setting: item })}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-400 hover:text-rose-300"
            onClick={() => setDeleteDialog({ open: true, id: item.id })}
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
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Webhook?"
        description="This webhook will no longer receive notifications. This action cannot be undone."
        confirmText="Confirm Delete"
        isLoading={isDeleting}
      />
      <AlertDialog 
        isOpen={testResult.open}
        onClose={() => setTestResult({ ...testResult, open: false })}
        title={testResult.title}
        description={testResult.message}
        variant={testResult.variant}
      />
      <WebhookDialog
        isOpen={formDialog.open}
        onClose={() => setFormDialog({ open: false, setting: null })}
        setting={formDialog.setting}
        onSuccess={() => {
            setFormDialog({ open: false, setting: null });
            setRefreshKey(prev => prev + 1);
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure external integrations like n8n to receive backup notifications.
          </p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setFormDialog({ open: true, setting: null })}>
          <PlusIcon className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<WebhookSetting>
          fetchUrl="/webhooks" 
          columns={columns}
          searchPlaceholder="Search webhooks..."
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
