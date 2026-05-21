"use client";

import React, { useState } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Badge, Button } from "@/components/admin/ui/Core";
import { TrashIcon } from "@/components/admin/Icons";
import { Modal, AlertDialog } from "@/components/admin/ui/Dialog";
import { SmartSelect } from "@/components/admin/ui/Form";
import { apiFetch } from "@/lib/api";
import { ActivityLog } from "@/types/admin";

const RETENTION_OPTIONS = [
  { label: "Older than 7 days", value: "7" },
  { label: "Older than 30 days", value: "30" },
  { label: "Older than 90 days", value: "90" },
  { label: "Older than 180 days", value: "180" },
  { label: "Older than 365 days", value: "365" },
  { label: "ALL logs (purge everything)", value: "0" },
];

export default function AuditLogsPage() {
  const [purgeModal, setPurgeModal] = useState(false);
  const [olderThan, setOlderThan] = useState("30");
  const [isPurging, setIsPurging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resultDialog, setResultDialog] = useState<{ open: boolean; title: string; message: string; variant: "success" | "danger" }>({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const response = await apiFetch("/audit-logs/purge", {
        method: "POST",
        body: JSON.stringify({ older_than_days: Number(olderThan) }),
      });
      const data = await response.json();
      if (response.ok) {
        setPurgeModal(false);
        setRefreshKey((prev) => prev + 1);
        setResultDialog({
          open: true,
          title: "Purge Complete",
          message: data.message || "Old audit logs have been removed.",
          variant: "success",
        });
      } else {
        throw new Error(data.message || "Failed to purge logs.");
      }
    } catch (err: any) {
      setResultDialog({
        open: true,
        title: "Purge Failed",
        message: err.message || "Failed to communicate with the audit gateway.",
        variant: "danger",
      });
    } finally {
      setIsPurging(false);
    }
  };

  const columns = [
    {
      header: "Timestamp",
      accessor: "created_at" as const,
      className: "font-mono text-[10px] text-slate-500 w-48",
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
          'PURGE': 'error',
        };
        return <Badge variant={variants[item.action] || 'neutral'}>{item.action.replace('_', ' ')}</Badge>;
      },
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
      ),
    },
    {
      header: "Operator",
      accessor: (item: ActivityLog) => (
        <span className="text-xs text-slate-400">{item.user?.email || 'System'}</span>
      ),
    },
    {
      header: "IP Address",
      accessor: "ip_address" as const,
      className: "font-mono text-[10px] text-slate-500",
      align: "right" as const,
    },
  ];

  const selectedOption = RETENTION_OPTIONS.find((o) => o.value === olderThan);
  const isPurgeAll = olderThan === "0";

  return (
    <div className="space-y-6">
      <AlertDialog
        isOpen={resultDialog.open}
        onClose={() => setResultDialog({ ...resultDialog, open: false })}
        title={resultDialog.title}
        description={resultDialog.message}
        variant={resultDialog.variant}
      />

      <Modal
        isOpen={purgeModal}
        onClose={() => !isPurging && setPurgeModal(false)}
        title="Purge Audit Logs"
        description="Permanently remove old audit log entries. This action cannot be undone."
        variant="danger"
      >
        <div className="space-y-4">
          <SmartSelect
            label="Retention Window"
            options={RETENTION_OPTIONS}
            value={olderThan}
            onChange={setOlderThan}
            placeholder="Choose a retention window..."
          />
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">
            {isPurgeAll
              ? "ALL of your audit logs will be permanently deleted."
              : `All entries ${selectedOption?.label.toLowerCase()} will be permanently deleted.`}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setPurgeModal(false)} disabled={isPurging}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handlePurge} isLoading={isPurging}>
              Confirm Purge
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Audit Logs</h1>
          <p className="text-sm text-slate-400 mt-1">Immutable record of all sensitive operations within the vault.</p>
        </div>
        <Button
          variant="danger"
          className="gap-2"
          onClick={() => setPurgeModal(true)}
        >
          <TrashIcon className="h-4 w-4" />
          Purge Old Logs
        </Button>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<ActivityLog>
          fetchUrl="/audit-logs"
          columns={columns}
          searchPlaceholder="Filter logs by action or resource..."
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
