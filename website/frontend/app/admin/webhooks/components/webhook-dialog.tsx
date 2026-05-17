"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/admin/ui/Core";
import { Input, Switcher } from "@/components/admin/ui/Form";
import { WebhookSetting } from "@/types/admin";
import { apiFetch } from "@/lib/api";

interface WebhookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setting: WebhookSetting | null;
  onSuccess: () => void;
}

export function WebhookDialog({ isOpen, onClose, setting, onSuccess }: WebhookDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    webhook_url: "",
    target_whatsapp_id: "",
    secret_key: "",
    is_active: true,
    events: ["backup.success", "backup.failed"]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (setting) {
        setFormData({
          name: setting.name,
          webhook_url: setting.webhook_url,
          target_whatsapp_id: setting.target_whatsapp_id || "",
          secret_key: "", // Don't show existing secret
          is_active: setting.is_active,
          events: setting.events || ["backup.success", "backup.failed"]
        });
      } else {
        setFormData({
          name: "",
          webhook_url: "",
          target_whatsapp_id: "",
          secret_key: "",
          is_active: true,
          events: ["backup.success", "backup.failed"]
        });
      }
      setError(null);
    }
  }, [isOpen, setting]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEventChange = (eventValue: string, checked: boolean) => {
    setFormData(prev => {
      const newEvents = checked 
        ? [...prev.events, eventValue] 
        : prev.events.filter(e => e !== eventValue);
      return { ...prev, events: newEvents };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        target_whatsapp_id: formData.target_whatsapp_id || null,
        webhook_url: formData.webhook_url,
        is_active: formData.is_active,
        events: formData.events,
      };

      if (formData.secret_key) {
        payload.secret_key = formData.secret_key;
      } else if (!setting) {
        setError("Secret Key is required for new webhooks.");
        setIsLoading(false);
        return;
      }

      const url = setting ? `/webhooks/${setting.id}` : "/webhooks";
      const method = setting ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to save webhook.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 shrink-0">
          <h3 className="text-lg font-bold text-white">
            {setting ? "Edit Webhook" : "Add Webhook"}
          </h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
              {error}
            </div>
          )}

          <form id="webhook-form" onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Name"
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. n8n Production" 
              required 
            />

            <Input 
              label="Target WhatsApp ID (Optional)"
              name="target_whatsapp_id" 
              value={formData.target_whatsapp_id} 
              onChange={handleChange} 
              placeholder="e.g. 1203631234567@g.us or 628123456" 
              hint="Leave empty to use your profile number. Enter Group JID to send to a group."
            />

            <Input 
              label="Webhook URL"
              name="webhook_url" 
              type="url"
              value={formData.webhook_url} 
              onChange={handleChange} 
              placeholder="https://n8n.example.com/webhook/..." 
              required 
            />

            <Input 
              label="Secret Key"
              name="secret_key" 
              type="password"
              value={formData.secret_key} 
              onChange={handleChange} 
              placeholder={setting ? "Leave blank to keep existing" : "Used for HMAC signature"} 
              required={!setting}
            />

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Trigger Events</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Backup Success</div>
                    <div className="text-xs text-slate-500">Triggered when a backup job completes successfully.</div>
                  </div>
                  <Switcher 
                    checked={formData.events.includes("backup.success")}
                    onChange={(val) => handleEventChange("backup.success", val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Backup Failed</div>
                    <div className="text-xs text-slate-500">Triggered when a backup job encounters an error.</div>
                  </div>
                  <Switcher 
                    checked={formData.events.includes("backup.failed")}
                    onChange={(val) => handleEventChange("backup.failed", val)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-200">Webhook Status</div>
                  <div className="text-xs text-slate-500">Enable or disable this webhook integration.</div>
                </div>
                <Switcher 
                  checked={formData.is_active}
                  onChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="webhook-form" variant="primary" isLoading={isLoading}>
            {setting ? "Save Changes" : "Create Webhook"}
          </Button>
        </div>
      </div>
    </div>
  );
}
