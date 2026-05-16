"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { CheckCircleIcon, XCircleIcon } from "@/components/admin/Icons";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Establishing secure link with Google Vault...");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Google Drive access was denied or cancelled.");
      return;
    }

    if (code) {
      handleConnect(code);
    } else {
      setStatus("error");
      setMessage("Invalid callback payload received from Google.");
    }
  }, [searchParams]);

  const handleConnect = async (code: string) => {
    try {
      const response = await apiFetch("/storage/google/connect", {
        method: "POST",
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        setStatus("success");
        setMessage("Google Drive has been successfully linked to your vault.");
        
        setTimeout(() => {
          router.push("/admin/storage");
        }, 2000);
      } else {
        throw new Error("Handshake failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Failed to exchange secure tokens with Google.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 text-center">
      {status === "processing" && (
        <>
          <div className="relative">
            <div className="h-20 w-20 border-4 border-emerald-500/10 rounded-full" />
            <div className="absolute top-0 h-20 w-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Syncing Credentials</h2>
            <p className="text-slate-400 max-w-xs">{message}</p>
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 animate-in zoom-in duration-300">
            <CheckCircleIcon className="h-10 w-10 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Access Granted</h2>
            <p className="text-emerald-400/80 font-medium">{message}</p>
            <p className="text-slate-500 text-xs pt-4">Redirecting you back to dashboard...</p>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="h-20 w-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 animate-in zoom-in duration-300">
            <XCircleIcon className="h-10 w-10 text-rose-400" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Handshake Failed</h2>
              <p className="text-rose-400/80 font-medium">{message}</p>
            </div>
            <button 
              onClick={() => router.push("/admin/storage")}
              className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            >
              RETURN TO SETTINGS
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StorageCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
