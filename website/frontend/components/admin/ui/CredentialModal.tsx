"use client";

import React, { useState } from "react";
import { Modal } from "./Dialog";
import { Button } from "./Core";
import { EyeIcon, EyeOffIcon } from "../Icons";

interface ServerCredential {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  auth_type: "password" | "private_key";
  password?: string | null;
  private_key?: string | null;
  passphrase?: string | null;
}

interface DatabaseCredential {
  id: string;
  label: string;
  db_type: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_username: string;
  db_password: string;
  server?: {
    label: string;
    host: string;
  } | null;
}

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "server" | "database";
  credential: ServerCredential | DatabaseCredential | null;
}

export function CredentialModal({ isOpen, onClose, type, credential }: CredentialModalProps) {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  if (!credential) return null;

  const renderField = ({
    label,
    value,
    fieldKey,
    sensitive = false,
    multiline = false,
  }: {
    label: string;
    value: string | null | undefined;
    fieldKey: string;
    sensitive?: boolean;
    multiline?: boolean;
  }) => {
    const safeValue = value ?? "";
    const isVisible = visibleFields[fieldKey];
    const isCopied = copiedField === fieldKey;

    return (
      <div key={fieldKey} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
          <div className="flex items-center gap-1.5">
            {sensitive && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                Sensitive
              </span>
            )}
            {sensitive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleVisibility(fieldKey)}
                className="text-slate-400 hover:text-emerald-400"
                title={isVisible ? "Hide" : "Show"}
              >
                {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(safeValue, fieldKey)}
              className={`text-slate-400 ${isCopied ? "text-emerald-400" : "hover:text-blue-400"}`}
              title="Copy"
              disabled={!safeValue}
            >
              {isCopied ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>
        <pre
          className={`overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-200 ${multiline ? "max-h-64 overflow-y-auto" : ""}`}
        >
          {sensitive && !isVisible ? "********************************" : safeValue || "-"}
        </pre>
      </div>
    );
  };

  const title = type === "server" ? "Decrypted Server Access" : "Decrypted Database Credential";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Sensitive data shown in plain text. Close dialog when done."
      variant="warning"
    >
      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Label</div>
            <div className="text-sm font-bold text-slate-200">{credential.label}</div>
          </div>
          <span className="rounded-full border border-slate-700/60 bg-slate-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {type}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {type === "server" && "host" in credential && (
          <>
            {renderField({ label: "Endpoint", value: `${credential.host}:${credential.port}`, fieldKey: "endpoint" })}
            {renderField({ label: "Username", value: credential.username, fieldKey: "username" })}
            {renderField({ label: "Auth Type", value: credential.auth_type, fieldKey: "auth_type" })}
            {credential.auth_type === "password" &&
              renderField({ label: "Password", value: credential.password, fieldKey: "password", sensitive: true })}
            {credential.auth_type === "private_key" && (
              <>
                {renderField({
                  label: "Private Key",
                  value: credential.private_key,
                  fieldKey: "private_key",
                  sensitive: true,
                  multiline: true,
                })}
                {renderField({
                  label: "Passphrase",
                  value: credential.passphrase,
                  fieldKey: "passphrase",
                  sensitive: true,
                })}
              </>
            )}
          </>
        )}

        {type === "database" && "db_host" in credential && (
          <>
            {credential.server && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Associated Server</div>
                <div className="mt-1 text-sm font-bold text-slate-200">{credential.server.label}</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{credential.server.host}</div>
              </div>
            )}
            {renderField({
              label: "Endpoint",
              value: `${credential.db_host}:${credential.db_port}`,
              fieldKey: "db_endpoint",
            })}
            {renderField({ label: "Database Type", value: credential.db_type, fieldKey: "db_type" })}
            {renderField({ label: "Database Name", value: credential.db_name, fieldKey: "db_name" })}
            {renderField({ label: "Username", value: credential.db_username, fieldKey: "db_username" })}
            {renderField({ label: "Password", value: credential.db_password, fieldKey: "db_password", sensitive: true })}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}


