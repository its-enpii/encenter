"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/admin/ui/Core";
import { Input } from "@/components/admin/ui/Form";
import { apiFetch } from "@/lib/api";
import { UserIcon } from "@/components/admin/Icons";

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirmation: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (response.ok) {
          const data = await response.json();
          setFormData((prev) => ({
            ...prev,
            name: data.name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
          }));
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const payload: any = {
        name: formData.name,
        phone_number: formData.phone_number,
      };

      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      const response = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ text: "Profile updated successfully.", type: "success" });
        setFormData(prev => ({ ...prev, password: "", password_confirmation: "" }));
      } else {
        const data = await response.json();
        setMessage({ text: data.message || "Failed to update profile.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal settings and notification preferences.
          </p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Personal Details Card */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <UserIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Personal Details</h2>
          </div>

          <Input 
            label="Email Address"
            type="email" 
            name="email" 
            value={formData.email} 
            disabled 
            className="bg-slate-800/50 text-slate-500" 
            hint="Email cannot be changed."
          />

          <Input 
            label="Full Name"
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />

          <Input 
            label="WhatsApp Number"
            type="text" 
            name="phone_number" 
            value={formData.phone_number} 
            onChange={handleChange} 
            placeholder="e.g. 628123456789" 
            hint="Used for backup notifications via n8n webhook."
          />
        </div>

        {/* Security Settings Card */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 space-y-6 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Security Settings</h2>
          </div>

          <div className="space-y-4 flex-1">
            <p className="text-sm text-slate-400 mb-6">Leave these fields blank if you don't want to change your password.</p>
            
            <Input 
              label="New Password"
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Min. 8 characters"
            />
            
            <Input 
              label="Confirm Password"
              type="password" 
              name="password_confirmation" 
              value={formData.password_confirmation} 
              onChange={handleChange} 
            />
          </div>

          <div className="pt-6 mt-auto">
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              SAVE PROFILE CHANGES
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
