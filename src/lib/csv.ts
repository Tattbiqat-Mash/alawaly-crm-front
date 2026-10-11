/**
 * Minimal RFC 4180 CSV parser for browser-side imports: quoted fields, escaped quotes (""),
 * commas/newlines inside quotes, CRLF or LF, an optional UTF-8 BOM, and comma, semicolon or
 * tab separators (detected from the header line).
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const separator = [",", ";", "\t"].reduce((best, s) => (count(firstLine, s) > count(firstLine, best) ? s : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === separator) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully empty lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function count(line: string, ch: string) {
  return line.split(ch).length - 1;
}

/** Header row → objects keyed by trimmed column names; blank cells are omitted. */
export function csvToRecords(text: string): { columns: string[]; records: Record<string, string>[] } {
  const [header = [], ...body] = parseCsv(text);
  const columns = header.map((h) => h.trim());
  const records = body.map((cells) =>
    Object.fromEntries(
      columns.flatMap((col, i) => {
        const value = (cells[i] ?? "").trim();
        return col && value !== "" ? [[col, value]] : [];
      }),
    ),
  );
  return { columns, records };
}
