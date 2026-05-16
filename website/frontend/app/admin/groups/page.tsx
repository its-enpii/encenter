"use client";

import React, { useState } from "react";
import { SmartTable } from "@/components/admin/ui/SmartTable";
import { Button } from "@/components/admin/ui/Core";
import { PlusIcon, LayoutGridIcon } from "@/components/admin/Icons";
import { Modal, AlertDialog } from "@/components/admin/ui/Dialog";
import { Input, Textarea } from "@/components/admin/ui/Form";
import { apiFetch } from "@/lib/api";
import { ServerGroup } from "@/types/admin";

export default function GroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleEditClick = (group: ServerGroup) => {
    setEditId(group.id);
    setFormData({ name: group.name, description: group.description || "" });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setLoading(true);
    try {
      const response = await apiFetch(`/server-groups/${deleteDialog.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteDialog({ open: false, id: null });
        setRefreshKey(prev => prev + 1);
      } else {
        setErrorDialog({ open: true, message: "Failed to delete group. Ensure no servers are linked to it." });
      }
    } catch (err) {
      setErrorDialog({ open: true, message: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      header: "Group Name", 
      accessor: (item: ServerGroup) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
            <LayoutGridIcon className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-200">{item.name}</span>
        </div>
      )
    },
    { header: "Description", accessor: "description" as const, className: "text-slate-400" },
    { 
      header: "Nodes", 
      accessor: (item: ServerGroup) => (
        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-500">
          {item.servers_count || 0} NODES
        </span>
      )
    },
    {
      header: "Actions",
      accessor: (item: ServerGroup) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>Edit</Button>
          <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => handleDeleteClick(item.id)}>Delete</Button>
        </div>
      ),
      align: "right" as const
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editId ? `/server-groups/${editId}` : "/server-groups";
      const method = editId ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditId(null);
        setFormData({ name: "", description: "" });
        setRefreshKey(prev => prev + 1);
      } else {
        setErrorDialog({ open: true, message: editId ? "Failed to update group." : "Failed to create group." });
      }
    } catch (err) {
      setErrorDialog({ open: true, message: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <AlertDialog 
        isOpen={errorDialog.open} 
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title="Error"
        description={errorDialog.message}
        variant="danger"
      />

      <Modal 
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        title="Delete Server Group?"
        description="This will remove the category. Servers in this group will be marked as 'unassigned'."
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setDeleteDialog({ open: false, id: null })}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm} isLoading={loading}>Delete Group</Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closePortal} 
        title={editId ? "Update Server Group" : "Create New Server Group"}
        description={editId ? "Modify group identity and description." : "Categorize your infrastructure for better organization."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Group Name" 
            placeholder="e.g. Production Cluster" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Textarea 
            label="Description" 
            placeholder="What is this group for?" 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closePortal}>Cancel</Button>
            <Button type="submit" isLoading={loading}>{editId ? "Save Changes" : "Create Group"}</Button>
          </div>
        </form>
      </Modal>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Server Groups</h1>
          <p className="text-sm text-slate-400 mt-1">Organize your server nodes into logical clusters.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          New Group
        </Button>
      </div>

      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <SmartTable<ServerGroup> 
          fetchUrl="/api/v1/server-groups" 
          columns={columns} 
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
