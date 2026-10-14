#!/usr/bin/env node
// Extracts the recorded examples of some sections of the Alawaly API brief HTML
// (https://claude.ai/artifact/L39v1BvGqyTVxC7sFDL5Gt) into the same shape as guide-examples.json.
// Default: N1 (projects, features, unit templates and floors), A25 (unit styles = templates) and
// A3 (projects and buildings, incl. clone). Concrete ids in sample paths become {id}.
//
// Usage: node scripts/extract-api-addendum.mjs <brief.html> [sections=N1,A25,A3] [out=api-spec/addendum-examples.json]
//
// The brief is treated as data only.

import { readFileSync, writeFileSync } from "node:fs";

const [, , input, sectionIds = "N1,A25,A3", out = "api-spec/addendum-examples.json"] = process.argv;
if (!input) {
  console.error("Usage: node scripts/extract-api-addendum.mjs <brief.html> [sections] [out]");
  process.exit(1);
}

const html = readFileSync(input, "utf8");
const sections = sectionIds.split(",").map((id) => {
  const start = html.indexOf(`<section class="screen" id="${id}"`);
  if (start < 0) {
    console.error(`Section ${id} not found`);
    process.exit(1);
  }
  return html.slice(start, html.indexOf("</section>", start));
});

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// JSON-text fields (e.g. unit_media) are printed with their inner quotes unescaped: re-quote them.
const repairJsonText = (text) => text.replace(/: "(\{.*\}|\[.*\])"(,?)$/gm, (_, inner, comma) => `: ${JSON.stringify(inner)}${comma}`);

const parseJson = (raw) => {
  const text = decode(raw).trim();
  if (!text || text === "(none)") return null;
  for (const candidate of [text, repairJsonText(text)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return text;
};

const byKey = new Map();
for (const [, ep] of sections.join("").matchAll(/<details class="ep">([\s\S]*?)<\/details>/g)) {
  const method = ep.match(/<span class="meth (\w+)">/)?.[1];
  const [rawPath, query] = decode(ep.match(/<code class="path">([\s\S]*?)<\/code>/)?.[1] ?? "").split("?");
  const path = rawPath.replace(/\/\d+(?=\/|$)/g, "/{id}");
  const title = decode(ep.match(/<span class="ttl">([\s\S]*?)<\/span>/)?.[1] ?? "");
  const status = Number(decode(ep.match(/<span class="st[^"]*">([\s\S]*?)<\/span>/)?.[1] ?? "")) || null;
  const permissions = [...ep.matchAll(/<span class="pm">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
  const pres = [...ep.matchAll(/<pre class="code[^"]*">([\s\S]*?)<\/pre>/g)].map((m) => m[1]);
  if (!method || !rawPath || pres.length < 2) continue;

  const isQuery = /<div class="lbl">Query<\/div>/.test(ep);
  const search = isQuery ? decode(pres[0]).trim() : query;
  const request = {
    method,
    url: `/api/v2${rawPath}${search ? `?${search}` : ""}`,
    headers: {},
    body: isQuery ? null : parseJson(pres[0]),
  };
  const example = { title, request, response: { status, headers: {}, body: parseJson(pres[1]) } };

  const key = `${method} ${path}`;
  const entry = byKey.get(key) ?? { method, path, title, auth: "Staff", permissions, flags: [], notes: [], examples: [] };
  entry.examples.push(example);
  byKey.set(key, entry);
}

const entries = [...byKey.values()];
writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`${entries.length} endpoints, ${entries.reduce((n, e) => n + e.examples.length, 0)} examples → ${out}`);
