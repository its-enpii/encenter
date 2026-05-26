import Link from "next/link";
import { getDocEntries } from "@/lib/docs";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const entries = getDocEntries();

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            User Guide
          </p>
          <nav className="space-y-1 text-sm">
            {entries.map((entry) => {
              const href = entry.isIndex
                ? "/admin/help"
                : `/admin/help/${entry.slug}`;
              return (
                <Link
                  key={entry.slug || "index"}
                  href={href}
                  className="block rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white aria-[current=page]:bg-emerald-500/10 aria-[current=page]:text-emerald-300"
                >
                  {entry.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
