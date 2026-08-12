"use client";

import React, { useState } from "react";
import { Server } from "@/types/admin";
import { TerminalIcon, RefreshIcon, LayoutDashboardIcon, FolderIcon } from "@/components/admin/Icons";
import { Button, Badge } from "@/components/admin/ui/Core";
import { SmartSelect } from "@/components/admin/ui/Form";

export type SubTab = "dashboard" | "terminal" | "sftp";

interface SshSubSidebarProps {
  servers: Server[];
  selectedServerId: string;
  onSelectServer: (id: string) => void;
  loadingServers: boolean;
  activeTab: SubTab;
  onChangeTab: (tab: SubTab) => void;
  currentServer: Server | null;
  handshakeStatus: "IDLE" | "CONNECTING" | "CONNECTED" | "FAILED";
  handshakeMessage: string;
  onHandshake: () => void;
}

export function SshSubSidebar({
  servers,
  selectedServerId,
  onSelectServer,
  loadingServers,
  activeTab,
  onChangeTab,
  currentServer,
  handshakeStatus,
  handshakeMessage,
  onHandshake,
}: SshSubSidebarProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const serverOptions = servers.map((srv) => ({
    label: srv.label + " (" + srv.host + ")",
    value: srv.id,
  }));

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar transition-all duration-300 ${
        isMobileExpanded ? "w-64 md:w-64 lg:w-72" : "w-14 md:w-64 lg:w-72"
      }`}
    >
      {/* Mobile Toggle Button Header */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between md:hidden">
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
          title="Toggle Sub Sidebar"
        >
          <TerminalIcon className="h-5 w-5 text-emerald-400" />
        </button>
        {isMobileExpanded && (
          <span className="text-xs font-bold text-slate-200 truncate">Console Menu</span>
        )}
      </div>

      {/* Header & Target Server Selector */}
      <div className={`p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-3 ${isMobileExpanded ? "block" : "hidden md:block"}`}>
        <div className="flex items-center gap-2 mb-1">
          <TerminalIcon className="h-5 w-5 text-emerald-400 shrink-0" />
          <h2 className="font-bold text-slate-100 text-sm tracking-wide">SSH & SFTP Console</h2>
        </div>

        {/* Server Selector Component */}
        {loadingServers ? (
          <div className="h-10 w-full bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        ) : (
          <SmartSelect
            label="ACTIVE TARGET NODE"
            options={serverOptions}
            value={selectedServerId}
            onChange={(val) => onSelectServer(val)}
            placeholder="Select target node..."
          />
        )}

        {/* Server Status & Handshake Card */}
        {currentServer && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Host:</span>
              <span
                className="text-slate-200 font-bold truncate max-w-[140px]"
                title={currentServer.username + "@" + currentServer.host + ":" + currentServer.port}
              >
                {currentServer.username}@{currentServer.host}:{currentServer.port}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Auth:</span>
              <span className="text-slate-300 font-mono uppercase">{currentServer.auth_type}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Status:</span>
              <Badge
                variant={
                  handshakeStatus === "CONNECTED"
                    ? "success"
                    : handshakeStatus === "FAILED"
                    ? "error"
                    : "neutral"
                }
              >
                {handshakeStatus}
              </Badge>
            </div>

            {/* Handshake Action Button */}
            <Button
              variant={handshakeStatus === "CONNECTED" ? "outline" : "primary"}
              size="sm"
              className="w-full mt-2 gap-2 text-xs font-semibold shadow-lg shadow-emerald-500/10"
              onClick={onHandshake}
              isLoading={handshakeStatus === "CONNECTING"}
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              {handshakeStatus === "CONNECTED" ? "Re-Establish Handshake" : "Establish Handshake"}
            </Button>

            {handshakeMessage && (
              <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">{handshakeMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* Console Views Sub-Navigation */}
      <nav className="p-2 md:p-3 space-y-1.5 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1 ${isMobileExpanded ? "block" : "hidden md:block"}`}>
          Console Views
        </p>

        <button
          onClick={() => {
            onChangeTab("dashboard");
            setIsMobileExpanded(false);
          }}
          title="Server Dashboard"
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all " + (
            activeTab === "dashboard"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md font-bold"
              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent"
          )}
        >
          <LayoutDashboardIcon className="h-4 w-4 shrink-0" />
          <span className={isMobileExpanded ? "block" : "hidden md:block"}>Server Dashboard</span>
        </button>

        <button
          onClick={() => {
            onChangeTab("terminal");
            setIsMobileExpanded(false);
          }}
          title="SSH Terminal Console"
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all " + (
            activeTab === "terminal"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md font-bold"
              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent"
          )}
        >
          <TerminalIcon className="h-4 w-4 shrink-0" />
          <span className={isMobileExpanded ? "block" : "hidden md:block"}>SSH Terminal Console</span>
        </button>

        <button
          onClick={() => {
            onChangeTab("sftp");
            setIsMobileExpanded(false);
          }}
          title="SFTP File Manager"
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all " + (
            activeTab === "sftp"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md font-bold"
              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent"
          )}
        >
          <FolderIcon className="h-4 w-4 shrink-0" />
          <span className={isMobileExpanded ? "block" : "hidden md:block"}>SFTP File Manager</span>
        </button>
      </nav>
    </aside>
  );
}
