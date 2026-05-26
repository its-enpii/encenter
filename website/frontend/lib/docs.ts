import fs from "node:fs";
import path from "node:path";

export type DocEntry = {
  slug: string;
  title: string;
  filePath: string;
  isIndex: boolean;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "user-guide");

function readTitle(raw: string, fallback: string): string {
  const match = raw.match(/^#\s+(.+)$/m);
  if (!match) return fallback;
  return match[1].trim();
}

function fileToSlug(file: string): { slug: string; isIndex: boolean } {
  const base = file.replace(/\.md$/i, "");
  if (/^readme$/i.test(base)) return { slug: "", isIndex: true };
  return { slug: base, isIndex: false };
}

let cache: DocEntry[] | null = null;

export function getDocEntries(): DocEntry[] {
  if (cache) return cache;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const entries: DocEntry[] = files.map((file) => {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { slug, isIndex } = fileToSlug(file);
    return {
      slug,
      filePath,
      isIndex,
      title: readTitle(raw, file),
    };
  });
  entries.sort((a, b) => {
    if (a.isIndex) return -1;
    if (b.isIndex) return 1;
    return a.slug.localeCompare(b.slug, undefined, { numeric: true });
  });
  cache = entries;
  return entries;
}

export function getDocBySlug(slug: string | undefined): DocEntry | null {
  const entries = getDocEntries();
  if (!slug) return entries.find((e) => e.isIndex) ?? null;
  return entries.find((e) => e.slug === slug) ?? null;
}

export function readDocContent(entry: DocEntry): string {
  return fs.readFileSync(entry.filePath, "utf8");
}

export function getDocSlugs(): string[] {
  return getDocEntries()
    .filter((e) => !e.isIndex)
    .map((e) => e.slug);
}

export function getDocNeighbors(slug: string | undefined) {
  const entries = getDocEntries();
  const idx = entries.findIndex(
    (e) => (slug ? e.slug === slug : e.isIndex)
  );
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? entries[idx - 1] : null,
    next: idx < entries.length - 1 ? entries[idx + 1] : null,
  };
}
