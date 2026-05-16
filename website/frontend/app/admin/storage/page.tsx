"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/admin/ui/Core";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import { CloudIcon, CheckCircleIcon, XCircleIcon } from "@/components/admin/Icons";

interface StorageConfig {
  id: string;
  provider: string;
  email: string;
  folder_name: string;
  is_active: boolean;
}

export default function StoragePage() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [folderName, setFolderName] = useState("EnCenter_Backups");
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/storage");
      if (!response.ok) throw new Error("Failed to load config");
      
      const data = await response.json();
      if (data.data) {
        setConfig(data.data);
        if (data.data.folder_name) {
          setFolderName(data.data.folder_name);
        }
      }
    } catch (err) {
      console.error("Storage config fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFolderName = async () => {
    setIsEditingFolder(false);
    try {
      const response = await apiFetch("/storage/settings", {
        method: "POST",
        body: JSON.stringify({ folder_name: folderName })
      });
      if (response.ok) {
        // Refresh config to show new name
        loadConfig();
      }
    } catch (err) {
      console.error("Failed to save folder name");
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await apiFetch("/storage/google/auth-url");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      setErrorDialog({
        open: true,
        title: "Connection Failed",
        message: "Could not initialize Google OAuth flow. Please check backend logs."
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Drive?")) return;

    try {
      const response = await apiFetch("/storage", { method: "DELETE" });
      if (response.ok) {
        setConfig(null);
      }
    } catch (err) {
      alert("Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <AlertDialog 
        isOpen={errorDialog.open} 
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title={errorDialog.title}
        description={errorDialog.message}
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cloud Storage</h1>
          <p className="text-sm text-slate-400 mt-1">Configure your remote vault for backup archives</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CloudIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Primary Storage Provider</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Google Drive Integration</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              {config ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">CONNECTED</p>
                      <p className="text-xs text-slate-400">{config.email || 'Authorized Account'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={handleDisconnect}>
                    DISCONNECT
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                      <XCircleIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400">NOT CONNECTED</p>
                      <p className="text-xs text-slate-500">Enable cloud syncing for your archives</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleConnect} isLoading={connecting}>
                    CONNECT NOW
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 group relative cursor-pointer hover:border-emerald-500/30 transition-all"
                  onClick={() => !isEditingFolder && setIsEditingFolder(true)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Target Folder</p>
                    <span className="text-[9px] text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">CLICK TO EDIT</span>
                  </div>
                  
                  {isEditingFolder ? (
                    <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        className="bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-sm text-white w-full focus:outline-none font-mono"
                        autoFocus
                        onBlur={handleUpdateFolderName}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateFolderName()}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 mt-1 font-mono">/{folderName}</p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Retention Policy</p>
                  <p className="text-sm text-slate-200 mt-1">Keep last 30 backups</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Storage Status</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your remote vault is the primary destination for all database archives. Ensure your Google Drive account has sufficient space for the retention policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
