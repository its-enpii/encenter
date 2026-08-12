"use client";

import React from "react";
import { Button } from "@/components/admin/ui/Core";
import { Input, Textarea } from "@/components/admin/ui/Form";

interface SftpModalsProps {
  editingFile: { path: string; content: string } | null;
  savingFile: boolean;
  onEditFileContentChange: (content: string) => void;
  onCloseEditModal: () => void;
  onSaveFile: () => void;
  showNewFolderModal: boolean;
  newFolderName: string;
  onNewFolderNameChange: (val: string) => void;
  onCloseNewFolderModal: () => void;
  onCreateFolder: () => void;
}

export function SftpModals({
  editingFile,
  savingFile,
  onEditFileContentChange,
  onCloseEditModal,
  onSaveFile,
  showNewFolderModal,
  newFolderName,
  onNewFolderNameChange,
  onCloseNewFolderModal,
  onCreateFolder,
}: SftpModalsProps) {
  return (
    <>
      {/* MODAL: EDIT FILE */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm font-mono truncate">
                Editing: {editingFile.path}
              </h3>
              <button
                onClick={onCloseEditModal}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <Textarea
              value={editingFile.content}
              onChange={(e) => onEditFileContentChange(e.target.value)}
              rows={16}
              className="font-mono text-xs text-emerald-300 min-h-[300px]"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onCloseEditModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onSaveFile} isLoading={savingFile}>
                Save File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW FOLDER */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-sm">Create New Directory</h3>
            <Input
              label="Directory Name"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              placeholder="e.g. uploads..."
              className="font-mono"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onCloseNewFolderModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onCreateFolder}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
