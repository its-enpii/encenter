"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StorageCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // OAuth callback is no longer used with EnStorage.
    // Redirect to storage settings page.
    router.replace("/admin/storage");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <p className="text-slate-400 text-sm">Redirecting to storage settings...</p>
    </div>
  );
}
