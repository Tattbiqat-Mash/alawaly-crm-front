#!/usr/bin/env node
// Extracts the recorded API examples from the Alawaly Frontend Guide HTML
// (https://claude.ai/artifact/Jgn33ejkic8PFJuHByd2Xt) into machine-readable files.
//
// Usage: node scripts/extract-api-guide.mjs <guide.html> [outDir=api-spec]
//
// The guide is treated as data only. Output:
//   <outDir>/guide-examples.json  one entry per endpoint with its recorded examples
//   <outDir>/endpoints.md         a readable catalogue (method, path, auth, permissions)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , input, outDir = "api-spec"] = process.argv;
if (!input) {
  console.error("Usage: node scripts/extract-api-guide.mjs <guide.html> [outDir]");
  process.exit(1);
}

const html = readFileSync(input, "utf8");

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const parseBody = (raw) => {
  const text = decode(raw).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseHeaderLines = (lines) =>
  Object.fromEntries(
    lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );

function parseExample(chunk, fallbackTitle) {
  const reqMatch = chunk.match(/<pre class="code req">([\s\S]*?)<\/pre>/);
  if (!reqMatch) return null;
  const reqLines = decode(reqMatch[1]).split("\n");
  const [method, url] = reqLines[0].trim().split(/\s+/);
  const reqHeaders = parseHeaderLines(reqLines.slice(1));

  const respIdx = chunk.indexOf('Response <span class="st');
  const beforeResp = respIdx >= 0 ? chunk.slice(reqMatch.index + reqMatch[0].length, respIdx) : "";
  const reqBodyMatch = beforeResp.match(/<pre class='code'>([\s\S]*?)<\/pre>/);

  const afterResp = respIdx >= 0 ? chunk.slice(respIdx) : "";
  const status = Number(afterResp.match(/<span class="st [a-z]+">(\d+)/)?.[1] ?? 0) || null;
  const respHeaders = parseHeaderLines(
    [...afterResp.matchAll(/<div class='muted small mono'>([\s\S]*?)<\/div>/g)].flatMap((m) =>
      decode(m[1]).split("\n"),
    ),
  );
  const respBodyMatch = afterResp.match(/<pre class='code'>([\s\S]*?)<\/pre>/);

  return {
    title: fallbackTitle,
    request: {
      method,
      url,
      headers: reqHeaders,
      body: reqBodyMatch ? parseBody(reqBodyMatch[1]) : null,
    },
    response: {
      status,
      headers: respHeaders,
      body: respBodyMatch ? parseBody(respBodyMatch[1]) : null,
    },
  };
}

const blocks = html.split(/<details class="ep"/).slice(1).map((b) => b.split("</details>")[0]);

const endpoints = [];
for (const block of blocks) {
  const method = block.match(/<span class="m (\w+)">/)?.[1];
  const path = decode(block.match(/<span class="path">([^<]*)/)?.[1] ?? "");
  const summaryTitle = decode(block.match(/<span class="ttl">([^<]*)/)?.[1] ?? "").replace(/\s*\(\+\d+\)$/, "");
  if (!method || !path) continue;

  const metaHtml = block.match(/<div class="meta">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const pills = [...metaHtml.matchAll(/<span class="pill(?: (\w+))?">([^<]*)<\/span>/g)].map((m) => ({
    kind: m[1] ?? "",
    text: decode(m[2]).trim(),
  }));
  const auth = pills.find((p) => p.kind === "acc")?.text ?? null;
  const permissions = pills.filter((p) => p.kind === "" && /^[a-z]+(\.[a-z]+)+$/.test(p.text)).map((p) => p.text);
  const flags = pills.filter((p) => p.kind && p.kind !== "acc").map((p) => p.text);
  const notes = [...block.matchAll(/<p class="small">([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]).trim());

  // Each example is introduced by an optional <h4> title followed by <div class="ex">.
  const examples = [];
  const exParts = block.split(/<div class="ex">/);
  for (let i = 1; i < exParts.length; i++) {
    const prev = exParts[i - 1];
    const h4s = [...prev.matchAll(/<h4>([\s\S]*?)<\/h4>/g)];
    const title = h4s.length ? decode(h4s[h4s.length - 1][1]).trim() : summaryTitle;
    const ex = parseExample(exParts[i], title);
    if (ex) examples.push(ex);
  }

  const existing = endpoints.find((e) => e.method === method && e.path === path);
  if (existing) {
    // The reference section (the block carrying the meta pills) names the endpoint best.
    if (metaHtml) existing.title = summaryTitle;
    const key = (x) => `${x.title}|${x.request.url}|${x.response.status}`;
    const seen = new Set(existing.examples.map(key));
    existing.examples.push(...examples.filter((x) => !seen.has(key(x))));
    for (const p of permissions) if (!existing.permissions.includes(p)) existing.permissions.push(p);
    for (const n of notes) if (!existing.notes.includes(n)) existing.notes.push(n);
    existing.auth ??= auth;
  } else {
    endpoints.push({ method, path, title: summaryTitle, auth, permissions, flags, notes, examples });
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "guide-examples.json"), JSON.stringify(endpoints, null, 2) + "\n");

const md = [
  "# Alawaly API v2 — endpoint catalogue",
  "",
  "Generated by `scripts/extract-api-guide.mjs` from the Frontend Guide. Paths are relative to `/api/v2`.",
  "",
  "| Method | Path | Title | Auth | Permissions | Flags | Examples |",
  "|---|---|---|---|---|---|---|",
  ...endpoints.map(
    (e) =>
      `| ${e.method} | \`${e.path}\` | ${e.title} | ${e.auth ?? ""} | ${e.permissions.join(", ")} | ${e.flags.join(", ")} | ${e.examples.length} |`,
  ),
  "",
].join("\n");
writeFileSync(join(outDir, "endpoints.md"), md);

const exampleCount = endpoints.reduce((n, e) => n + e.examples.length, 0);
console.log(`Extracted ${endpoints.length} endpoints and ${exampleCount} examples into ${outDir}/`);
