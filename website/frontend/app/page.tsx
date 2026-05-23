"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon } from "@/components/admin/Icons";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? "/admin" : "/login");
  }, [loading, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <ShieldIcon className="h-12 w-12 text-emerald-500" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Initializing Secure Connection...
        </p>
      </div>
    </div>
  );
}
