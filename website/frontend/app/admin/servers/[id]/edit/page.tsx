"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Input,
  Textarea,
  Switcher,
  SmartSelect,
} from "@/components/admin/ui/Form";
import { Button } from "@/components/admin/ui/Core";
import { ShieldIcon, ServerIcon, ArrowLeftIcon, DatabaseIcon } from "@/components/admin/Icons";
import { apiFetch } from "@/lib/api";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import Link from "next/link";
import { ServerGroup } from "@/types/admin";

export default function EditServerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [dbConnections, setDbConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const [formData, setFormData] = useState({
    label: "",
    host: "",
    port: "22",
    group_id: "",
    username: "",
    auth_type: "password" as "password" | "private_key",
    password: "",
    private_key: "",
    passphrase: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setFetching(true);
      try {
        // 1. Fetch server groups first
        const groupsRes = await apiFetch("/server-groups");
        const groupsData = await groupsRes.json();
        if (groupsData.data) setGroups(groupsData.data);

        // 2. Then fetch server data
        const serverRes = await apiFetch(`/servers/${id}`);
        const serverData = await serverRes.json();
        
        if (serverData.data) {
          const s = serverData.data;
          setFormData({
            label: s.label,
            host: s.host,
            port: String(s.port),
            group_id: s.group_id || "",
            username: s.username,
            auth_type: s.auth_type,
            password: "",
            private_key: "",
            passphrase: "",
            notes: s.notes || "",
            is_active: s.is_active,
          });
        }

        // 3. Fetch linked databases
        const dbRes = await apiFetch(`/database-connections?server_id=${id}`);
        const dbData = await dbRes.json();
        if (dbData.data) setDbConnections(dbData.data);

      } catch (err) {
        console.error("Fetch error:", err);
        setErrorDialog({
          open: true,
          title: "Vault Access Failed",
          message: "Could not retrieve the requested node configuration."
        });
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = { ...formData };
    if (!submissionData.password) delete (submissionData as any).password;
    if (!submissionData.private_key) delete (submissionData as any).private_key;

    try {
      const response = await apiFetch(`/servers/${id}`, {
        method: "PUT",
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        router.push("/admin/servers");
      } else {
        const error = await response.json();
        setErrorDialog({
          open: true,
          title: "Update Failed",
          message: error.message || "The vault rejected the modifications."
        });
      }
    } catch (err) {
      setErrorDialog({
        open: true,
        title: "Connection Error",
        message: "Failed to communicate with the secure gateway."
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <AlertDialog 
        isOpen={errorDialog.open} 
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title={errorDialog.title}
        description={errorDialog.message}
        variant="danger"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/servers">
            <button className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Modify Node Config</h1>
            <p className="text-sm text-slate-400 mt-1">
              Update parameters for <span className="text-emerald-400 font-mono">{formData.label}</span>
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <ShieldIcon className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            Vault re-encryption active
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ServerIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Core Parameters
            </h2>
          </div>

          <Input
            label="Node Label"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Host / IP Address"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                required
              />
            </div>
            <Input
              label="SSH Port"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
            />
          </div>

          <SmartSelect
            label="Server Group"
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            value={formData.group_id}
            onChange={(val) => setFormData({ ...formData, group_id: val })}
          />

          <Textarea
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <ShieldIcon className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Credentials
            </h2>
          </div>

          <Input
            label="SSH Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Auth Strategy
            </label>
            <div className="flex gap-4 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: "password" })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.auth_type === "password" ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                PASSWORD
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: "private_key" })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.auth_type === "private_key" ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                PRIVATE KEY
              </button>
            </div>
          </div>

          {formData.auth_type === "password" ? (
            <Input
              label="SSH Password"
              type="password"
              placeholder="Leave empty to keep current"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <Textarea
                label="Private Key Content"
                placeholder="Paste new key or leave empty"
                rows={5}
                className="font-mono text-[10px]"
                value={formData.private_key}
                onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
              />
              <Input
                label="Key Passphrase"
                type="password"
                value={formData.passphrase}
                onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Node Status</span>
            <Switcher
              checked={formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={loading}>
              SAVE CHANGES
            </Button>
          </div>
        </div>
      </form>

      {/* Linked Databases Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DatabaseIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Linked Database Credentials</h2>
          </div>
          <Link href="/admin/vault/new">
            <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              + Link New Database
            </Button>
          </Link>
        </div>

        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Label</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Target</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Engine</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dbConnections.length > 0 ? dbConnections.map((db) => (
                <tr key={db.id} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-200">{db.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${db.db_name ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {db.db_name || 'ALL DATABASES'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 font-mono uppercase">{db.db_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${db.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                      <span className="text-xs text-slate-400">{db.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/vault`}>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-slate-500 italic">No database connections linked to this node yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
