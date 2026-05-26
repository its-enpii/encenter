import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getDocBySlug,
  getDocNeighbors,
  getDocSlugs,
  readDocContent,
} from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";

type Params = { slug?: string[] };

export function generateStaticParams(): Array<{ slug: string[] }> {
  const slugs = getDocSlugs();
  return [{ slug: [] }, ...slugs.map((s) => ({ slug: [s] }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getDocBySlug(slug?.[0]);
  if (!entry) return { title: "User Guide" };
  return {
    title: `${entry.title} · User Guide`,
    description: `Panduan pengguna EnCenter — ${entry.title}`,
  };
}

function rewriteLink(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("#")) return href;
  if (href.startsWith("mailto:")) return href;

  // .md links among user guide files -> /admin/help/<slug>
  // Examples: README.md, 01-pengenalan.md, ./07-backup.md
  const cleaned = href.replace(/^\.\//, "");
  const mdMatch = cleaned.match(/^([\w./-]+?)\.md(#.+)?$/i);
  if (mdMatch) {
    const file = mdMatch[1];
    const hash = mdMatch[2] ?? "";
    if (/(^|\/)readme$/i.test(file)) return `/admin/help${hash}`;
    const base = file.split("/").pop() ?? file;
    return `/admin/help/${base}${hash}`;
  }

  // Cross-doc references like ../README.md or ../api-documentation.md fall back to root docs.
  if (cleaned.startsWith("../")) return "/admin/help";

  return href;
}

export default async function HelpPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const slugStr = slug?.[0];
  const entry = getDocBySlug(slugStr);
  if (!entry) notFound();

  const source = readDocContent(entry);
  const { html, headings } = renderMarkdown(source, {
    rewriteLink,
    skipFirstH1: true,
  });
  const { prev, next } = getDocNeighbors(slugStr);

  // Strip the trailing prev/next nav line that our markdown files include —
  // we render proper buttons below.
  const cleanedHtml = html.replace(
    /<hr[^>]*\/>\s*<p[^>]*>(?:[^<]*?(?:Sebelumnya|Selanjutnya|Daftar Isi|Kembali)[\s\S]*?)<\/p>\s*$/i,
    ""
  );

  const tocItems = headings.filter((h) => h.level === 2 || h.level === 3);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          User Guide
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {entry.title}
        </h1>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div
          className="max-w-none rounded-2xl border border-slate-800 bg-slate-900/30 px-6 py-2 md:px-10 md:py-4"
          dangerouslySetInnerHTML={{ __html: cleanedHtml }}
        />
        {tocItems.length > 0 && (
          <aside className="hidden xl:block">
            <div className="sticky top-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                On this page
              </p>
              <ul className="space-y-1 text-xs">
                {tocItems.map((h) => (
                  <li
                    key={h.slug}
                    className={h.level === 3 ? "pl-3" : ""}
                  >
                    <a
                      href={`#${h.slug}`}
                      className="block rounded px-2 py-1 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-emerald-300"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>

      <nav className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-stretch sm:justify-between">
        {prev ? (
          <Link
            href={prev.isIndex ? "/admin/help" : `/admin/help/${prev.slug}`}
            className="group flex flex-1 flex-col rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              ← Sebelumnya
            </span>
            <span className="mt-1 text-sm font-semibold text-slate-200 group-hover:text-emerald-300">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="hidden flex-1 sm:block" />
        )}
        {next ? (
          <Link
            href={next.isIndex ? "/admin/help" : `/admin/help/${next.slug}`}
            className="group flex flex-1 flex-col rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-right transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Selanjutnya →
            </span>
            <span className="mt-1 text-sm font-semibold text-slate-200 group-hover:text-emerald-300">
              {next.title}
            </span>
          </Link>
        ) : (
          <span className="hidden flex-1 sm:block" />
        )}
      </nav>
    </article>
  );
}
