"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon } from "@/components/admin/Icons";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.replace("/admin");
    } else {
      router.replace("/login");
    }
  }, [router]);

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
