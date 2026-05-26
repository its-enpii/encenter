function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type LinkRewriter = (href: string) => string;

function renderInline(raw: string, rewriteLink: LinkRewriter): string {
  // Replace inline code first using placeholders so other rules don't touch it.
  const codes: string[] = [];
  let working = raw.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });

  working = escapeHtml(working);

  // Bold ** ** and __ __
  working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  working = working.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic * * and _ _
  working = working.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  working = working.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

  // Links [text](href)
  working = working.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, text: string, href: string, title?: string) => {
      const finalHref = rewriteLink(href);
      const isExternal = /^https?:\/\//i.test(finalHref);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const targetAttr = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      return `<a href="${escapeHtml(finalHref)}"${titleAttr}${targetAttr} class="text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline">${text}</a>`;
    }
  );

  // Restore inline code with styled span
  working = working.replace(/\u0000CODE(\d+)\u0000/g, (_, idx: string) => {
    const code = codes[Number(idx)];
    return `<code class="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-300">${escapeHtml(code)}</code>`;
  });

  return working;
}

type Heading = { level: number; text: string; slug: string };

export type RenderResult = {
  html: string;
  headings: Heading[];
};

export function renderMarkdown(
  source: string,
  options: { rewriteLink?: LinkRewriter; skipFirstH1?: boolean } = {}
): RenderResult {
  const rewriteLink = options.rewriteLink ?? ((href) => href);
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  const out: string[] = [];
  const headings: Heading[] = [];
  let firstH1Seen = false;
  const usedSlugs = new Map<string, number>();

  function uniqueSlug(text: string): string {
    const base = slugify(text) || "section";
    const count = usedSlugs.get(base) ?? 0;
    usedSlugs.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      i += 1;
      const buffer: string[] = [];
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing fence
      const code = escapeHtml(buffer.join("\n"));
      out.push(
        `<pre class="my-5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-200"><code class="font-mono${lang ? ` language-${lang}` : ""}">${code}</code></pre>`
      );
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      if (level === 1 && options.skipFirstH1 && !firstH1Seen) {
        firstH1Seen = true;
        i += 1;
        continue;
      }
      firstH1Seen = firstH1Seen || level === 1;

      const slug = uniqueSlug(text);
      headings.push({ level, text, slug });
      const sizeClass =
        level === 1
          ? "text-3xl font-bold text-white tracking-tight mt-0 mb-6"
          : level === 2
            ? "text-2xl font-bold text-white mt-10 mb-4"
            : level === 3
              ? "text-lg font-semibold text-slate-100 mt-8 mb-3"
              : "text-base font-semibold text-slate-200 mt-6 mb-2";
      out.push(
        `<h${level} id="${slug}" class="${sizeClass} scroll-mt-24">${renderInline(text, rewriteLink)}</h${level}>`
      );
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*---\s*$/.test(line) || /^\s*\*\*\*\s*$/.test(line)) {
      out.push('<hr class="my-8 border-slate-800" />');
      i += 1;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buffer: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buffer.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      const inner = renderMarkdown(buffer.join("\n"), {
        rewriteLink,
        skipFirstH1: false,
      }).html;
      out.push(
        `<blockquote class="my-5 border-l-4 border-emerald-500/40 bg-emerald-500/5 px-5 py-3 text-slate-300 [&_p]:my-0 [&_p+p]:mt-2">${inner}</blockquote>`
      );
      continue;
    }

    // Table (GFM): header line, separator, body
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[i + 1])) {
      const splitRow = (row: string) =>
        row
          .replace(/^\s*\|/, "")
          .replace(/\|\s*$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = splitRow(line);
      i += 2; // skip header + separator
      const bodyRows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        bodyRows.push(splitRow(lines[i]));
        i += 1;
      }
      const headerHtml = header
        .map(
          (cell) =>
            `<th class="border-b border-slate-700 bg-slate-900/60 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-400">${renderInline(cell, rewriteLink)}</th>`
        )
        .join("");
      const bodyHtml = bodyRows
        .map(
          (row) =>
            `<tr class="border-b border-slate-800/80 last:border-0">${row
              .map(
                (cell) =>
                  `<td class="px-3 py-2 align-top text-slate-300">${renderInline(cell, rewriteLink)}</td>`
              )
              .join("")}</tr>`
        )
        .join("");
      out.push(
        `<div class="my-5 overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-sm"><thead>${headerHtml ? `<tr>${headerHtml}</tr>` : ""}</thead><tbody>${bodyHtml}</tbody></table></div>`
      );
      continue;
    }

    // Lists (unordered and ordered, simple)
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const buffer: string[] = [];
      const itemRegex = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      while (i < lines.length && itemRegex.test(lines[i])) {
        let item = lines[i].replace(itemRegex, "");
        i += 1;
        // continuation lines (indented, no new list marker, not blank)
        while (
          i < lines.length &&
          !/^\s*$/.test(lines[i]) &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s+/.test(lines[i])
        ) {
          item += "\n" + lines[i].replace(/^\s+/, "");
          i += 1;
        }
        buffer.push(item);
      }
      const tag = ordered ? "ol" : "ul";
      const cls = ordered
        ? "my-4 list-decimal space-y-1.5 pl-6 text-slate-300 marker:text-slate-500"
        : "my-4 list-disc space-y-1.5 pl-6 text-slate-300 marker:text-emerald-500/70";
      const items = buffer
        .map((raw) => `<li>${renderInline(raw, rewriteLink)}</li>`)
        .join("");
      out.push(`<${tag} class="${cls}">${items}</${tag}>`);
      continue;
    }

    // Paragraph (greedy, until blank line or block trigger)
    const buffer: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*---\s*$/.test(lines[i])
    ) {
      buffer.push(lines[i]);
      i += 1;
    }
    out.push(
      `<p class="my-4 leading-relaxed text-slate-300">${renderInline(buffer.join(" "), rewriteLink)}</p>`
    );
  }

  return { html: out.join("\n"), headings };
}
