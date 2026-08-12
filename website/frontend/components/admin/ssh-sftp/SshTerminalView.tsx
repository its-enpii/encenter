"use client";

import React, { useEffect, useRef, useState } from "react";
import { Server } from "@/types/admin";
import { Button } from "@/components/admin/ui/Core";
import { apiFetch } from "@/lib/api";

interface SshTerminalViewProps {
  currentServer: Server | null;
  activeTab?: string;
}

export function SshTerminalView({ currentServer, activeTab }: SshTerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<any>(null);
  const fitAddonInstance = useRef<any>(null);
  const inputBuffer = useRef<string>("");

  const [executing, setExecuting] = useState(false);
  const [currentCwd, setCurrentCwd] = useState("~");

  // Prompt formatting helper
  const getPrompt = (server: Server | null, dir = "~") => {
    const userHost = server ? `${server.username}@${server.host}` : "ssh-terminal";
    return `\r\n\x1b[1;32m${userHost}\x1b[0m:\x1b[1;34m${dir}\x1b[0m$ `;
  };

  // Keep terminal instance alive across tab switches
  useEffect(() => {
    let term: any = null;
    let isMounted = true;

    async function initXterm() {
      if (!terminalRef.current || xtermInstance.current) return;

      try {
        // @ts-ignore
        const { Terminal } = await import("@xterm/xterm");
        // @ts-ignore
        const { CanvasAddon } = await import("@xterm/addon-canvas");
        // @ts-ignore
        const { FitAddon } = await import("@xterm/addon-fit");

        if (!isMounted) return;

        term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
          theme: {
            background: "#020617",
            foreground: "#e2e8f0",
            cursor: "#10b981",
            selectionBackground: "#05966950",
            black: "#0f172a",
            red: "#f43f5e",
            green: "#10b981",
            yellow: "#f59e0b",
            blue: "#3b82f6",
            magenta: "#a855f7",
            cyan: "#06b6d4",
            white: "#f8fafc",
          },
          convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddonInstance.current = fitAddon;

        // Load Canvas Addon for high performance rendering
        try {
          const canvasAddon = new CanvasAddon();
          term.loadAddon(canvasAddon);
        } catch (e) {
          console.warn("Canvas addon initialization warning:", e);
        }

        term.open(terminalRef.current);
        fitAddon.fit();
        xtermInstance.current = term;

        // Welcome banner with clean Unicode bullet
        term.writeln("\x1b[1;32m[+] Welcome to EnVault Interactive Xterm Console (Canvas Accelerated)\x1b[0m");
        term.writeln("\x1b[90mConnected target node: " + (currentServer ? `${currentServer.label} (${currentServer.host})` : "None") + "\x1b[0m");
        term.write(getPrompt(currentServer, "~"));

        // Key handler
        term.onData(async (data: string) => {
          if (!xtermInstance.current) return;

          // Enter key
          if (data === "\r") {
            const cmd = inputBuffer.current.trim();
            inputBuffer.current = "";
            term.write("\r\n");

            if (cmd) {
              if (cmd === "clear") {
                term.clear();
                term.write(getPrompt(currentServer, currentCwd));
                return;
              }

              await executeCommandInTerm(cmd);
            } else {
              term.write(getPrompt(currentServer, currentCwd));
            }
          }
          // Backspace key
          else if (data === "\x7f" || data === "\b") {
            if (inputBuffer.current.length > 0) {
              inputBuffer.current = inputBuffer.current.slice(0, -1);
              term.write("\b \b");
            }
          }
          // Printable characters
          else if (data >= " " || data === "\t") {
            inputBuffer.current += data;
            term.write(data);
          }
        });

        // Resize Listener
        const handleResize = () => {
          if (fitAddonInstance.current) {
            try {
              fitAddonInstance.current.fit();
            } catch (e) {}
          }
        };

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      } catch (err) {
        console.error("Xterm setup error:", err);
      }
    }

    initXterm();

    return () => {
      isMounted = false;
      // Do not dispose on tab switch - keep xterm instance intact in memory
    };
  }, [currentServer]);

  // Re-fit canvas layout when tab becomes active again
  useEffect(() => {
    if (activeTab === "terminal" && fitAddonInstance.current) {
      const timer = setTimeout(() => {
        try {
          fitAddonInstance.current.fit();
        } catch (e) {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Execute Command via Backend SSH Service and output to Xterm
  const executeCommandInTerm = async (cmd: string) => {
    if (!currentServer || !xtermInstance.current) return;
    setExecuting(true);

    const term = xtermInstance.current;

    try {
      const res = await apiFetch(`/servers/${currentServer.id}/ssh/exec`, {
        method: "POST",
        body: JSON.stringify({ command: cmd }),
      });

      const data = await res.json();

      if (res.ok) {
        const output = data.output || "";
        const formatted = output.replace(/\r?\n/g, "\r\n");
        term.writeln(formatted);
      } else {
        term.writeln(`\x1b[31mError: ${data.message || "Command execution failed."}\x1b[0m`);
      }
    } catch (err) {
      term.writeln("\x1b[31mError: Network failure communicating with gateway.\x1b[0m");
    } finally {
      setExecuting(false);
      term.write(getPrompt(currentServer, currentCwd));
    }
  };

  const handleRunQuickCmd = async (cmd: string) => {
    if (!xtermInstance.current || executing) return;
    const term = xtermInstance.current;
    term.write(cmd + "\r\n");
    await executeCommandInTerm(cmd);
  };

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.write(getPrompt(currentServer, currentCwd));
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-10rem)] shadow-2xl overflow-hidden">
      {/* Terminal Window Top Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 font-mono">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-bold text-slate-300">
            {currentServer ? `${currentServer.username}@${currentServer.host}` : "xterm-console"}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-2">
            Canvas GPU Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear Screen
          </Button>
        </div>
      </div>

      {/* Quick Command Toolbar */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Cmds:</span>
        {["uname -a", "uptime", "df -h", "free -m", "docker ps", "netstat -tuln", "ps aux"].map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleRunQuickCmd(cmd)}
            disabled={executing}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 rounded-lg font-mono text-[11px] border border-slate-700/60 shrink-0 transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Xterm.js Canvas DOM Container */}
      <div className="flex-1 p-3 bg-slate-950 overflow-hidden relative min-h-0">
        <div ref={terminalRef} className="w-full h-full text-xs font-mono" />
      </div>
    </div>
  );
}
