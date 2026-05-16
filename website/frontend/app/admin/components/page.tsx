"use client";

import React, { useState } from "react";
import { Button, Badge } from "@/components/admin/ui/Core";
import { Input, Textarea, Switcher, Checkbox, Radio, FileInput } from "@/components/admin/ui/Form";
import { SmartTable } from "@/components/admin/ui/SmartTable";

export default function UIComponentsPage() {
  const [switchOn, setSwitchOn] = useState(false);
  const [radioVal, setRadioVal] = useState("opt1");

  const sampleData = [
    { id: 1, name: "Database Backup", status: "Success", size: "1.2GB", date: "2026-05-14" },
    { id: 2, name: "System Update", status: "Pending", size: "450MB", date: "2026-05-15" },
    { id: 3, name: "Security Audit", status: "Failed", size: "12KB", date: "2026-05-12" },
    { id: 4, name: "Log Rotation", status: "Success", size: "89MB", date: "2026-05-10" },
    { id: 5, name: "Cache Clear", status: "Success", size: "5MB", date: "2026-05-09" },
    { id: 6, name: "Network Scan", status: "Success", size: "2MB", date: "2026-05-08" },
    { id: 7, name: "User Migration", status: "Warning", size: "15MB", date: "2026-05-07" },
  ];

  const columns = [
    { header: "ID", accessor: "id" as const, className: "w-16" },
    { header: "Resource Name", accessor: "name" as const },
    { 
      header: "Status", 
      accessor: (item: any) => (
        <Badge variant={item.status === 'Success' ? 'success' : item.status === 'Warning' ? 'warning' : item.status === 'Failed' ? 'error' : 'info'}>
          {item.status}
        </Badge>
      )
    },
    { header: "Size", accessor: "size" as const, align: "right" as const },
    { header: "Execution Date", accessor: "date" as const, align: "right" as const },
  ];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Buttons & Badges</h2>
        <div className="flex flex-wrap gap-4 items-center bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger Zone</Button>
          <Button variant="ghost">Ghostly</Button>
          <Button isLoading>Processing...</Button>
          
          <div className="flex gap-2 ml-8">
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Critical</Badge>
            <Badge variant="info">System</Badge>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Form Inputs</h2>
          <div className="space-y-6 bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
            <Input label="Server Identity" placeholder="e.g. PROD-DB-01" />
            <Input label="Access Key" type="password" placeholder="••••••••" error="Minimum 16 characters required" />
            <Textarea label="Encryption Policy Description" placeholder="Describe the policy..." />
            <FileInput label="Upload Security Certificate (.crt)" />
            
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase">Selectors</p>
                <Checkbox label="Enable MFA" checked={true} readOnly />
                <Checkbox label="Auto-rotate keys" />
              </div>
              
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase">Radio Options</p>
                <Radio label="US-EAST-1" name="region" checked={radioVal === 'opt1'} onChange={() => setRadioVal('opt1')} />
                <Radio label="EU-WEST-1" name="region" checked={radioVal === 'opt2'} onChange={() => setRadioVal('opt2')} />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase">Toggles</p>
                <Switcher label="Stealth Mode" checked={switchOn} onChange={setSwitchOn} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Smart Data Table</h2>
          <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
            <SmartTable initialData={sampleData} columns={columns} searchPlaceholder="Search vault logs..." />
          </div>
        </div>
      </section>
    </div>
  );
}
