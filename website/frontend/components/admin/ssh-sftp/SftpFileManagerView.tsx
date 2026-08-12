"use client";

import React from "react";
import { FolderIcon, FileIcon, RefreshIcon, PlusIcon, TrashIcon } from "@/components/admin/Icons";
import { Button } from "@/components/admin/ui/Core";
import { Input } from "@/components/admin/ui/Form";

export interface SftpItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mtime: string | null;
  permissions: string | null;
}

interface SftpFileManagerViewProps {
  sftpPath: string;
  sftpItems: SftpItem[];
  loadingSftp: boolean;
  uploadFileObj: File | null;
  uploading: boolean;
  onPathChange: (path: string) => void;
  onRefreshPath: (path: string) => void;
  onOpenItem: (item: SftpItem) => void;
  onReadFile: (path: string) => void;
  onDeleteItem: (item: SftpItem) => void;
  onShowNewFolderModal: () => void;
  onSelectUploadFile: (file: File | null) => void;
  onConfirmUpload: () => void;
}

export function SftpFileManagerView({
  sftpPath,
  sftpItems,
  loadingSftp,
  uploadFileObj,
  uploading,
  onPathChange,
  onRefreshPath,
  onOpenItem,
  onReadFile,
  onDeleteItem,
  onShowNewFolderModal,
  onSelectUploadFile,
  onConfirmUpload,
}: SftpFileManagerViewProps) {

  // Calculate parent directory path
  const getParentPath = () => {
    if (!sftpPath || sftpPath === "/") return "/";
    const cleanPath = sftpPath.replace(/\/$/, "");
    const lastSlash = cleanPath.lastIndexOf("/");
    return lastSlash <= 0 ? "/" : cleanPath.substring(0, lastSlash);
  };

  const isAtRoot = !sftpPath || sftpPath === "/";
  const parentPath = getParentPath();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* SFTP Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Go to Parent Directory Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={isAtRoot || loadingSftp}
            onClick={() => onRefreshPath(parentPath)}
            title={isAtRoot ? "At root directory" : `Go up to ${parentPath}`}
            className="px-2.5 text-xs shrink-0 gap-1 text-slate-300 hover:text-emerald-400 disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="hidden md:inline font-mono">Up</span>
          </Button>

          <FolderIcon className="h-5 w-5 text-emerald-400 shrink-0 ml-1" />

          {/* Directory Path Input */}
          <Input
            value={sftpPath}
            onChange={(e) => onPathChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRefreshPath(sftpPath);
            }}
            placeholder="/path/to/directory"
            className="font-mono text-xs py-1.5 flex-1"
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefreshPath(sftpPath)}
            isLoading={loadingSftp}
            title="Refresh directory contents"
            className="px-3 text-xs shrink-0"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowNewFolderModal}
            className="gap-1.5 text-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New Folder
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors">
              Upload File
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onSelectUploadFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Pending File Upload Notification */}
      {uploadFileObj && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-mono">
            Ready to upload: {uploadFileObj.name} ({Math.round(uploadFileObj.size / 1024)} KB)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={onConfirmUpload} isLoading={uploading} className="text-xs">
              Confirm Upload
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onSelectUploadFile(null)} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* File List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Permissions</th>
              <th className="py-2.5 px-3">Modified</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {/* Parent Directory Row (..) */}
            {!isAtRoot && (
              <tr
                onClick={() => onRefreshPath(parentPath)}
                className="hover:bg-slate-800/60 transition-colors cursor-pointer bg-slate-900/30 text-emerald-400 font-bold"
              >
                <td className="py-2 px-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  <span>.. (Up to parent directory)</span>
                </td>
                <td className="py-2 px-3 text-slate-500 text-[11px]">parent</td>
                <td className="py-2 px-3 text-slate-500 text-[11px]">-</td>
                <td className="py-2 px-3 text-slate-500 text-[11px]">-</td>
                <td className="py-2 px-3 text-slate-500 text-[11px]">-</td>
                <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                  <span className="text-[10px] font-semibold text-slate-500 hover:text-emerald-400">Go Up</span>
                </td>
              </tr>
            )}

            {loadingSftp ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading directory contents via SFTP...
                </td>
              </tr>
            ) : sftpItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Directory is empty.
                </td>
              </tr>
            ) : (
              sftpItems.map((item) => (
                <tr key={item.name} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-2.5 px-3 font-medium">
                    <button
                      onClick={() => onOpenItem(item)}
                      className="flex items-center gap-2 text-slate-200 hover:text-emerald-400 text-left"
                    >
                      {item.type === "directory" ? (
                        <FolderIcon className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-sky-400 shrink-0" />
                      )}
                      <span>{item.name}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.type}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {item.type === "directory" ? "-" : Math.round(item.size / 1024) + " KB"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.permissions || "-"}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.mtime || "-"}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.type === "file" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReadFile(item.path)}
                          className="px-2 text-xs text-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteItem(item)}
                        className="px-2 text-xs text-rose-400 hover:text-rose-300"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
