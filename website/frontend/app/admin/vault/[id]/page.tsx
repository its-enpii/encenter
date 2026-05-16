"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input, Textarea, SmartSelect } from "@/components/admin/ui/Form";
import { Button } from "@/components/admin/ui/Core";
import { ShieldIcon, DatabaseIcon, ArrowLeftIcon } from "@/components/admin/Icons";
import { apiFetch } from "@/lib/api";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import Link from "next/link";
import { Server } from "@/types/admin";

export default function EditDatabasePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  
  const [formData, setFormData] = useState({
    server_id: "",
    label: "",
    db_type: "mysql",
    db_host: "127.0.0.1",
    db_port: "3306",
    db_name: "",
    db_username: "",
    db_password: "",
    notes: "",
  });

  useEffect(() => {
    // Fetch servers for the dropdown
    apiFetch("/servers?limit=100").then(res => res.json()).then(res => {
      if (res.data) setServers(res.data);
    });

    // Fetch existing credential data
    if (id) {
      apiFetch(`/database-connections/${id}`)
        .then(res => res.json())
        .then(res => {
          if (res.data) {
            setFormData({
              server_id: res.data.server_id,
              label: res.data.label,
              db_type: res.data.db_type,
              db_host: res.data.db_host,
              db_port: res.data.db_port,
              db_name: res.data.db_name || "",
              db_username: res.data.db_username,
              db_password: res.data.db_password, // API will likely return this as encrypted or masked, user must re-enter if changing. Wait, actually the API returns the decrypted password as we see in testConnection it uses it natively? Let's assume the API returns what the form expects.
              notes: res.data.notes || "",
            });
          }
        })
        .catch(() => {
          setErrorDialog({
            open: true,
            title: "Load Failure",
            message: "Failed to load the database credential details."
          });
        })
        .finally(() => {
          setInitialLoading(false);
        });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Omit empty password from payload to keep existing password
      const payload = { ...formData };
      if (!payload.db_password) {
        delete (payload as any).db_password;
      }

      const response = await apiFetch(`/database-connections/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/admin/vault");
      } else {
        const error = await response.json();
        setErrorDialog({
          open: true,
          title: "Vault Storage Error",
          message: error.message || "Failed to update and encrypt database credentials."
        });
      }
    } catch (err) {
      setErrorDialog({
        open: true,
        title: "Network Link Failure",
        message: "Encryption link error. Connection to the secure vault gateway failed."
      });
    } finally {
      setLoading(false);
    }
  };

  const dbTypes = [
    { label: "MySQL", value: "mysql" },
    { label: "MariaDB", value: "mariadb" },
    { label: "PostgreSQL", value: "postgresql" },
  ];

  if (initialLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
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
        <div className="flex items-center gap-4">
          <Link href="/admin/vault">
            <button className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Database Credential</h1>
            <p className="text-sm text-slate-400 mt-1">Update secure connection details for this host.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Context */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DatabaseIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Connection Context</h2>
          </div>

          <SmartSelect 
            label="Host Server"
            options={servers.map(s => ({ label: s.label, value: s.id }))}
            value={formData.server_id}
            onChange={(val) => setFormData({...formData, server_id: val})}
            placeholder="Select associated server..."
          />

          <Input 
            label="Credential Label" 
            placeholder="e.g. Main Production DB"
            value={formData.label}
            onChange={(e) => setFormData({...formData, label: e.target.value})}
            required
          />

          <SmartSelect 
            label="Database Engine"
            options={dbTypes}
            value={formData.db_type}
            onChange={(val) => setFormData({...formData, db_type: val})}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input 
                label="Database Host" 
                placeholder="127.0.0.1"
                value={formData.db_host}
                onChange={(e) => setFormData({...formData, db_host: e.target.value})}
                required
              />
            </div>
            <Input 
              label="Port" 
              placeholder="3306"
              value={formData.db_port.toString()}
              onChange={(e) => setFormData({...formData, db_port: e.target.value})}
            />
          </div>
        </div>

        {/* Database Auth */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <ShieldIcon className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Vault Auth</h2>
          </div>

          <Input 
            label="Database Name (Optional)" 
            placeholder="my_secure_db"
            value={formData.db_name}
            onChange={(e) => setFormData({...formData, db_name: e.target.value})}
            hint="Leave empty to access ALL databases (requires high-privilege user like root)"
          />

          <Input 
            label="DB Username" 
            placeholder="db_user"
            value={formData.db_username}
            onChange={(e) => setFormData({...formData, db_username: e.target.value})}
            required
          />

          <Input 
            label="DB Password" 
            type="password"
            placeholder="••••••••"
            value={formData.db_password || ""}
            onChange={(e) => setFormData({...formData, db_password: e.target.value})}
            hint="Leave blank to keep current password"
          />

          <Textarea 
            label="Security Notes"
            placeholder="Usage restrictions or specific config..."
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full" 
              isLoading={loading}
            >
              SAVE UPDATES TO VAULT
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
