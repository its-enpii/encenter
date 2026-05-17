"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, ServerIcon, DatabaseIcon } from "./Icons";
import { apiFetch, PMA_URL } from "@/lib/api";

export function GlobalSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const [serversRes, dbRes] = await Promise.all([
          apiFetch("/servers"),
          apiFetch("/database-connections")
        ]);

        const serversData = await serversRes.json();
        const dbData = await dbRes.json();

        const servers = (serversData.data?.data || serversData.data || []).filter((s: any) => 
          s.label.toLowerCase().includes(query.toLowerCase()) || 
          s.host.toLowerCase().includes(query.toLowerCase())
        ).map((s: any) => ({ ...s, _type: 'server', icon: <ServerIcon className="h-4 w-4" />, url: `/admin/servers/${s.id}/edit` }));

        const databases = (dbData.data?.data || dbData.data || []).filter((db: any) => 
          (db.db_name || "").toLowerCase().includes(query.toLowerCase()) || 
          (db.db_host || "").toLowerCase().includes(query.toLowerCase()) ||
          (db.label || "").toLowerCase().includes(query.toLowerCase())
        ).map((db: any) => ({ ...db, _type: 'database', icon: <DatabaseIcon className="h-4 w-4" />, url: `/admin/vault/${db.id}` }));

        setResults([...servers, ...databases].slice(0, 10)); // Top 10 results
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300); // 300ms debounce
    return () => clearTimeout(debounce);
  }, [query]);

  const handleOpenPma = (item: any) => {
    const form = document.createElement("form");
    form.action = `${PMA_URL}/autologin.php`;
    form.method = "POST";
    form.target = "_blank";

    const fields = {
      pma_username: item.db_username || "",
      pma_password: item.db_password || "",
      pma_servername: `${item.server?.host || item.db_host}:${item.db_port}`
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] sm:pt-[25vh]">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <SearchIcon className="h-5 w-5 text-emerald-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 outline-none"
            placeholder="Search for servers, databases, or IP addresses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">ESC</button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              Searching EnVault Network...
            </div>
          ) : results.length > 0 ? (
            results.map((result, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors group"
                onClick={() => {
                  if (result._type === 'database' && (result.db_type === 'mysql' || result.db_type === 'mariadb')) {
                    handleOpenPma(result);
                  } else {
                    router.push(result.url);
                  }
                  onClose();
                }}
              >
                <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400">
                  {result.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-200">{result.label || result.db_name}</h4>
                  <p className="text-xs font-mono text-slate-500">{result.host || result.db_host}</p>
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-800 px-2 py-0.5 rounded">{result._type}</span>
              </div>
            ))
          ) : query ? (
            <div className="p-8 text-center">
              <p className="text-sm font-bold text-slate-400">No resources found.</p>
              <p className="text-xs text-slate-500 mt-1">Try searching by IP address or label.</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Type to begin searching vault entries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
