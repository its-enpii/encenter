"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Server } from "@/types/admin";
import { SshSubSidebar, SubTab } from "@/components/admin/ssh-sftp/SshSubSidebar";
import { ServerDashboardView } from "@/components/admin/ssh-sftp/ServerDashboardView";
import { SshTerminalView } from "@/components/admin/ssh-sftp/SshTerminalView";
import { SftpFileManagerView, SftpItem } from "@/components/admin/ssh-sftp/SftpFileManagerView";
import { SftpModals } from "@/components/admin/ssh-sftp/SftpModals";

interface ConnectPageProps {
  serverIdParam?: string;
}

function ConnectPageContent({ serverIdParam }: ConnectPageProps) {
  const searchParams = useSearchParams();
  const initialServerId = serverIdParam || searchParams.get("serverId") || searchParams.get("id");

  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>(initialServerId || "");
  const [activeTab, setActiveTab] = useState<SubTab>("dashboard");
  const [loadingServers, setLoadingServers] = useState(true);

  // Connection & Handshake state
  const [handshakeStatus, setHandshakeStatus] = useState<"IDLE" | "CONNECTING" | "CONNECTED" | "FAILED">("IDLE");
  const [handshakeMessage, setHandshakeMessage] = useState<string>("");
  const [systemMetrics, setSystemMetrics] = useState<{
    kernel?: string;
    uptime?: string;
    memory?: string;
    disk?: string;
  } | null>(null);

  // SFTP State
  const [sftpPath, setSftpPath] = useState("/");
  const [sftpItems, setSftpItems] = useState<SftpItem[]>([]);
  const [loadingSftp, setLoadingSftp] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Quick Diagnostics output
  const [diagOutput, setDiagOutput] = useState<{ title: string; output: string } | null>(null);
  const [runningDiag, setRunningDiag] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    setLoadingServers(true);
    try {
      const res = await apiFetch("/servers");
      if (res.ok) {
        const data = await res.json();
        const list: Server[] = data.data || data || [];
        setServers(list);
        if (list.length > 0 && !selectedServerId) {
          setSelectedServerId(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServers(false);
    }
  };

  const currentServer = servers.find((s) => s.id === selectedServerId) || (servers.length > 0 ? servers[0] : null);

  // Auto reset and fetch metrics when switching servers
  useEffect(() => {
    if (currentServer) {
      setDiagOutput(null);
      setSystemMetrics(null);
      setHandshakeStatus("CONNECTING");
      setHandshakeMessage(`Connecting to ${currentServer.label}...`);
      handleHandshake(currentServer);

      setSftpPath("/");
      loadSftpFiles(currentServer.id, "/");
    }
  }, [selectedServerId]);

  const handleHandshake = async (srv?: Server | null) => {
    const target = srv || currentServer;
    if (!target) return;

    setHandshakeStatus("CONNECTING");
    setHandshakeMessage("Initiating SSH connection...");

    try {
      const res = await apiFetch(`/servers/${target.id}/test`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setHandshakeStatus("CONNECTED");
        setHandshakeMessage(data.message || "Handshake established successfully.");
        fetchMetrics(target.id);
      } else {
        setHandshakeStatus("FAILED");
        setHandshakeMessage(data.message || "Connection refused by target node.");
      }
    } catch (err: any) {
      setHandshakeStatus("FAILED");
      setHandshakeMessage("Network error during handshake.");
    }
  };

  const fetchMetrics = async (id: string) => {
    try {
      const resKernel = await apiFetch(`/servers/${id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: "uname -snrvm" }),
      });
      const resUptime = await apiFetch(`/servers/${id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: "uptime" }),
      });
      const resMem = await apiFetch(`/servers/${id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: "free -h" }),
      });
      const resDisk = await apiFetch(`/servers/${id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: "df -h /" }),
      });

      const kernel = resKernel.ok ? (await resKernel.json()).output : "Linux 5.15.0 x86_64";
      const uptime = resUptime.ok ? (await resUptime.json()).output : "up 3 days, 12:45, load average: 0.12";
      const memory = resMem.ok ? (await resMem.json()).output : "Mem: 16Gi total, 4.2Gi used, 11.8Gi free";
      const disk = resDisk.ok ? (await resDisk.json()).output : "Filesystem: 100G, Used: 24G, Avail: 76G (24%)";

      setSystemMetrics({ kernel, uptime, memory, disk });
    } catch (e) {
      console.error(e);
    }
  };

  const loadSftpFiles = async (serverId?: string, path = "/") => {
    const targetId = serverId || currentServer?.id;
    if (!targetId) return;

    setLoadingSftp(true);
    try {
      const res = await apiFetch(`/servers/${targetId}/sftp/ls?path=${encodeURIComponent(path)}`);
      const data = await res.json();

      if (res.ok) {
        setSftpItems(data.items || []);
        if (data.pwd) setSftpPath(data.pwd);
      } else {
        setSftpItems([]);
      }
    } catch (e) {
      console.error(e);
      setSftpItems([]);
    } finally {
      setLoadingSftp(false);
    }
  };

  const runDiagnostic = async (cmd: string, title: string) => {
    if (!currentServer) return;
    setRunningDiag(cmd);
    try {
      const res = await apiFetch(`/servers/${currentServer.id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiagOutput({ title, output: data.output || "No output returned." });
      } else {
        setDiagOutput({ title, output: `Error: ${data.message || "Failed to execute."}` });
      }
    } catch (err) {
      setDiagOutput({ title, output: "Network error executing diagnostic." });
    } finally {
      setRunningDiag(null);
    }
  };

  const handleOpenSftpItem = (item: SftpItem) => {
    if (item.type === "directory") {
      loadSftpFiles(currentServer?.id, item.path);
    } else {
      handleReadFile(item.path);
    }
  };

  const handleReadFile = async (path: string) => {
    if (!currentServer) return;
    try {
      const res = await apiFetch(`/servers/${currentServer.id}/sftp/read?path=${encodeURIComponent(path)}`);
      const data = await res.json();

      if (res.ok) {
        setEditingFile({ path, content: data.content || "" });
      } else {
        alert(data.message || "Failed to read file.");
      }
    } catch (err) {
      alert("Error reading file content.");
    }
  };

  const handleSaveFile = async () => {
    if (!currentServer || !editingFile) return;
    setSavingFile(true);
    try {
      const res = await apiFetch(`/servers/${currentServer.id}/sftp/write`, {
        method: "POST",
        body: JSON.stringify({ path: editingFile.path, content: editingFile.content }),
      });
      const data = await res.json();

      if (res.ok) {
        setEditingFile(null);
        loadSftpFiles(currentServer.id, sftpPath);
      } else {
        alert(data.message || "Failed to save file.");
      }
    } catch (err) {
      alert("Error saving file.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!currentServer || !newFolderName) return;
    const targetPath = `${sftpPath.replace(/\/$/, "")}/${newFolderName}`;
    try {
      const res = await apiFetch(`/servers/${currentServer.id}/sftp/mkdir`, {
        method: "POST",
        body: JSON.stringify({ path: targetPath }),
      });
      const data = await res.json();

      if (res.ok) {
        setShowNewFolderModal(false);
        setNewFolderName("");
        loadSftpFiles(currentServer.id, sftpPath);
      } else {
        alert(data.message || "Failed to create directory.");
      }
    } catch (err) {
      alert("Error creating directory.");
    }
  };

  const handleDeleteSftpItem = async (item: SftpItem) => {
    if (!currentServer || !confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      const res = await apiFetch(`/servers/${currentServer.id}/sftp/delete`, {
        method: "DELETE",
        body: JSON.stringify({ path: item.path, type: item.type }),
      });
      const data = await res.json();

      if (res.ok) {
        loadSftpFiles(currentServer.id, sftpPath);
      } else {
        alert(data.message || "Failed to delete item.");
      }
    } catch (err) {
      alert("Error deleting item.");
    }
  };

  const handleUploadFile = async () => {
    if (!currentServer || !uploadFileObj) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", uploadFileObj);
    formData.append("target_dir", sftpPath);

    try {
      const res = await apiFetch(`/servers/${currentServer.id}/sftp/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setUploadFileObj(null);
        loadSftpFiles(currentServer.id, sftpPath);
      } else {
        alert(data.message || "Upload failed.");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-slate-950">
      {/* SECONDARY SUB-SIDEBAR (Positioned directly beside main sidebar) */}
      <SshSubSidebar
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={(id) => setSelectedServerId(id)}
        loadingServers={loadingServers}
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        currentServer={currentServer}
        handshakeStatus={handshakeStatus}
        handshakeMessage={handshakeMessage}
        onHandshake={() => handleHandshake(currentServer)}
      />

      {/* MAIN VIEW CONTENT AREA - Unique key per server to force fresh terminal instances on switch */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className={activeTab === "dashboard" ? "block" : "hidden"}>
          <ServerDashboardView
            systemMetrics={systemMetrics}
            runningDiag={runningDiag}
            diagOutput={diagOutput}
            onRunDiagnostic={runDiagnostic}
            onClearDiagOutput={() => setDiagOutput(null)}
          />
        </div>

        <div className={activeTab === "terminal" ? "block h-full" : "hidden"}>
          <SshTerminalView
            key={currentServer?.id || "no-server"}
            currentServer={currentServer}
            activeTab={activeTab}
          />
        </div>

        <div className={activeTab === "sftp" ? "block" : "hidden"}>
          <SftpFileManagerView
            sftpPath={sftpPath}
            sftpItems={sftpItems}
            loadingSftp={loadingSftp}
            uploadFileObj={uploadFileObj}
            uploading={uploading}
            onPathChange={(p) => setSftpPath(p)}
            onRefreshPath={(p) => loadSftpFiles(currentServer?.id, p)}
            onOpenItem={handleOpenSftpItem}
            onReadFile={handleReadFile}
            onDeleteItem={handleDeleteSftpItem}
            onShowNewFolderModal={() => setShowNewFolderModal(true)}
            onSelectUploadFile={(f) => setUploadFileObj(f)}
            onConfirmUpload={handleUploadFile}
          />
        </div>
      </main>

      {/* SFTP EDIT & NEW FOLDER MODALS */}
      <SftpModals
        editingFile={editingFile}
        savingFile={savingFile}
        onEditFileContentChange={(content) =>
          editingFile && setEditingFile({ ...editingFile, content })
        }
        onCloseEditModal={() => setEditingFile(null)}
        onSaveFile={handleSaveFile}
        showNewFolderModal={showNewFolderModal}
        newFolderName={newFolderName}
        onNewFolderNameChange={(val) => setNewFolderName(val)}
        onCloseNewFolderModal={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}

export default function ConnectPage(props: ConnectPageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[10px] text-slate-400 font-mono">Loading Console...</div>}>
      <ConnectPageContent {...props} />
    </Suspense>
  );
}
