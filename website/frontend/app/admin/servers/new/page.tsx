"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Input,
  Textarea,
  Switcher,
  SmartSelect,
} from "@/components/admin/ui/Form";
import { Button } from "@/components/admin/ui/Core";
import { ShieldIcon, ServerIcon, ArrowLeftIcon } from "@/components/admin/Icons";
import { apiFetch } from "@/lib/api";
import { AlertDialog } from "@/components/admin/ui/Dialog";
import Link from "next/link";
import { ServerGroup } from "@/types/admin";

export default function NewServerPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [loading, setLoading] = useState(false);
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
    // Fetch server groups for the dropdown
    apiFetch("/server-groups")
      .then((res) => res.json())
      .then((res) => {
        if (res.data) setGroups(res.data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch("/servers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/admin/servers");
      } else {
        const error = await response.json();
        setErrorDialog({
          open: true,
          title: "Registration Failed",
          message: error.message || "The node could not be registered in the secure vault."
        });
      }
    } catch (err) {
      setErrorDialog({
        open: true,
        title: "Connection Error",
        message: "Failed to communicate with the secure gateway. Please check your network."
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Link href="/admin/servers">
            <button className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Register New Node</h1>
            <p className="text-sm text-slate-400 mt-1">
              Deploy a new server identity into the secure fleet.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <ShieldIcon className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            End-to-End Encrypted
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Basic Information */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ServerIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Basic Configuration
            </h2>
          </div>

          <Input
            label="Node Label"
            placeholder="e.g. PRODUCTION-WEB-01"
            value={formData.label}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Host / IP Address"
                placeholder="192.168.1.1"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                required
              />
            </div>
            <Input
              label="SSH Port"
              placeholder="22"
              value={formData.port}
              onChange={(e) =>
                setFormData({ ...formData, port: e.target.value })
              }
            />
          </div>

          <SmartSelect
            label="Server Group"
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            value={formData.group_id}
            onChange={(val) => setFormData({ ...formData, group_id: val })}
            placeholder="Select a group..."
          />

          <Textarea
            label="Internal Notes"
            placeholder="Describe the server's purpose..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </div>

        {/* Security Credentials */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <ShieldIcon className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Vault Credentials
            </h2>
          </div>

          <Input
            label="SSH Username"
            placeholder="root"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Authentication Method
            </label>
            <div className="flex gap-4 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, auth_type: "password" })
                }
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.auth_type === "password" ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                PASSWORD
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, auth_type: "private_key" })
                }
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
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <Textarea
                label="Private Key Content"
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                rows={5}
                className="font-mono text-[10px]"
                value={formData.private_key}
                onChange={(e) =>
                  setFormData({ ...formData, private_key: e.target.value })
                }
              />
              <Input
                label="Key Passphrase (Optional)"
                type="password"
                placeholder="Key password if any"
                value={formData.passphrase}
                onChange={(e) =>
                  setFormData({ ...formData, passphrase: e.target.value })
                }
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Node Status
            </span>
            <Switcher
              checked={formData.is_active}
              onChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={loading}>
              COMMIT TO VAULT
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
