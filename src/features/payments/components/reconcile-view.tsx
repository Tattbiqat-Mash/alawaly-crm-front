"use client";

import { ChevronDown, Download, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Field } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/use-error-message";
import { csvToRecords } from "@/lib/csv";
import { formatCount } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { ReconcileResult, ReconcileRow } from "../api";
import { useReconcile } from "../hooks";
import { usePaymentLabels } from "./labels";

const MAX_ROWS = 5000;
const REQUIRED = ["provider_ref", "amount", "status"] as const;
const BUCKETS = ["matched", "missing_local", "missing_remote", "amount_mismatch", "status_mismatch"] as const;
type Bucket = (typeof BUCKETS)[number];

function parse(text: string): { rows: ReconcileRow[] } | { error: "missingColumns" } | { error: "tooMany"; count: number } | null {
  if (!text.trim()) return null;
  const { columns, records } = csvToRecords(text);
  if (!REQUIRED.every((c) => columns.includes(c))) return { error: "missingColumns" };
  if (records.length > MAX_ROWS) return { error: "tooMany", count: records.length };
  return { rows: records.map((r) => ({ provider_ref: r.provider_ref ?? "", amount: r.amount ?? "", status: r.status ?? "" })) };
}

/** Saves one bucket of references as a one-column CSV (client-side; nothing leaves the browser). */
function exportBucket(name: string, refs: string[]) {
  const csv = ["provider_ref", ...refs.map((r) => `"${r.replace(/"/g, '""')}"`)].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reconcile-${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// S19 — Reconciliation (read-only comparison).
export function ReconcileView() {
  const t = useTranslations("reconcile");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const labels = usePaymentLabels();
  const inputId = useId();
  const reconcile = useReconcile();
  const [provider, setProvider] = useState("generic_hmac");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<Bucket | null>("missing_local");
  const parsed = useMemo(() => parse(text), [text]);
  const rows = parsed && "rows" in parsed ? parsed.rows : [];
  const result: ReconcileResult | undefined = reconcile.data;

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (rows.length) reconcile.mutate({ provider, rows });
        }}
      >
        <Field id="rc-provider" label={t("provider")} className="max-w-xs">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="rc-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="generic_hmac">{labels.provider("generic_hmac")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Label htmlFor={inputId}>{t("pasteLabel")}</Label>
        <Textarea
          id={inputId}
          rows={8}
          dir="ltr"
          spellCheck={false}
          className="font-mono text-xs"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            reconcile.reset();
          }}
          placeholder={"provider_ref,amount,status\nGW-7731,5000,succeeded"}
        />
        <p className="text-xs text-muted-foreground">{t("pasteHint")}</p>
        {parsed && "error" in parsed && (
          <FormError>{parsed.error === "tooMany" ? t("tooMany", { count: parsed.count }) : t("missingColumns")}</FormError>
        )}
        <Button type="submit" className="justify-self-start" disabled={!rows.length || reconcile.isPending}>
          {reconcile.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {reconcile.isPending ? t("comparing") : t("compare")}
        </Button>
        {reconcile.error && <FormError>{errorMessage(reconcile.error)}</FormError>}
      </form>

      {result && (
        <div className="grid gap-2">
          {BUCKETS.map((bucket) => {
            const refs = result[bucket] ?? [];
            const expanded = open === bucket;
            const bad = bucket !== "matched" && refs.length > 0;
            return (
              <section key={bucket} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : bucket)}
                    className="flex flex-1 items-center gap-2 text-start text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <ChevronDown aria-hidden className={cn("size-4 transition-transform", !expanded && "-rotate-90 rtl:rotate-90")} />
                    <span className={cn(bad && "text-warning", bucket === "matched" && refs.length > 0 && "text-success")}>{t(`buckets.${bucket}`)}</span>
                    <span className="num text-muted-foreground">({formatCount(refs.length, locale)})</span>
                  </button>
                  {refs.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => exportBucket(bucket, refs)}>
                      <Download data-icon="inline-start" />
                      {t("exportBucket")}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="max-h-64 overflow-auto border-t px-3 py-2">
                    {refs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noneInBucket")}</p>
                    ) : (
                      <ul className="grid gap-1 font-mono text-xs sm:grid-cols-3" dir="ltr">
                        {refs.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
