"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, FileUp, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { csvToRecords } from "@/lib/csv";
import { formatCount } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { issueText, MAX_IMPORT_ROWS, PRICE_COLUMNS, unitImportApi, type ImportIssue, type ImportResult } from "../api";

type Parsed =
  | { ok: true; rows: Record<string, string>[]; removed: string[] }
  | { ok: false; error: "noRows" | "missingCrmId" | "tooMany"; count?: number };

function parse(text: string): Parsed | null {
  if (!text.trim()) return null;
  const { columns, records } = csvToRecords(text);
  if (!columns.includes("crm_unit_id")) return { ok: false, error: "missingCrmId" };
  if (records.length === 0) return { ok: false, error: "noRows" };
  if (records.length > MAX_IMPORT_ROWS) return { ok: false, error: "tooMany", count: records.length };
  const removed = columns.filter((c) => PRICE_COLUMNS.includes(c));
  const rows = records.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !PRICE_COLUMNS.includes(k))));
  return { ok: true, rows, removed };
}

function Step({ label, state }: { label: string; state: "done" | "current" | "todo" }) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        state === "done" && "border-success/30 bg-success/5 text-success",
        state === "current" && "border-primary/40 bg-primary/5 font-medium text-primary",
        state === "todo" && "text-muted-foreground",
      )}
    >
      {state === "done" && <CircleCheck aria-hidden className="size-4" />}
      {label}
    </li>
  );
}

function IssueTable({ title, issues, tone }: { title: string; issues: ImportIssue[]; tone: "danger" | "warning" | "neutral" }) {
  const t = useTranslations("unitImport");
  if (issues.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h3
        className={cn(
          "border-b px-3 py-2 text-sm font-medium",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning",
        )}
      >
        {title} ({issues.length})
      </h3>
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.row")}</TableHead>
              <TableHead>{t("columns.crmId")}</TableHead>
              <TableHead>{t("columns.result")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue, i) => (
              <TableRow key={`${issue.row ?? i}-${i}`}>
                {/* The API counts rows from 0; people count from 1 (header excluded). */}
                <TableCell className="num">{issue.row !== undefined ? issue.row + 1 : "—"}</TableCell>
                <TableCell className="num" dir="ltr">
                  {issue.crm_unit_id ?? "—"}
                </TableCell>
                <TableCell className="whitespace-normal" dir="auto">
                  {issueText(issue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// S06 — Import units: add rows → dry run → commit (only when every row is valid).
export function UnitImportView() {
  const t = useTranslations("unitImport");
  const tc = useTranslations("common");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const inputId = useId();
  const idempotency = useIdempotencyKey();
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState(false);
  const [checked, setChecked] = useState<{ text: string; result: ImportResult } | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  const parsed = useMemo(() => parse(text), [text]);
  const rows = parsed?.ok ? parsed.rows : [];
  const result = checked && checked.text === text ? checked.result : null;

  const dryRun = useMutation({
    mutationFn: unitImportApi.dryRun,
    onSuccess: (r) => setChecked({ text, result: r }),
  });
  const commit = useMutation({
    mutationFn: () => unitImportApi.commit(rows, idempotency.key),
    onSuccess: (r) => {
      idempotency.renew();
      setApplied(r.applied ?? r.valid);
      toast.success(t("applied", { count: r.applied ?? r.valid }));
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (e) => {
      if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
    },
  });

  const reset = () => {
    setText("");
    setChecked(null);
    setApplied(null);
    dryRun.reset();
    commit.reset();
  };

  const canCommit = result !== null && result.invalid.length === 0 && result.valid > 0 && applied === null;
  const stepState = (step: 1 | 2 | 3) => {
    const current = applied !== null ? 4 : result ? 3 : rows.length ? 2 : 1;
    return step < current ? "done" : step === current ? "current" : "todo";
  };

  return (
    <div className="grid gap-4">
      <ol className="grid gap-2 sm:grid-cols-3">
        <Step label={t("steps.add")} state={stepState(1)} />
        <Step label={t("steps.check")} state={stepState(2)} />
        <Step label={t("steps.commit")} state={stepState(3)} />
      </ol>

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={inputId}>{t("pasteLabel")}</Label>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <FileUp data-icon="inline-start" />
              {t("chooseFile")}
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setFileError(false);
                    setText(await file.text());
                    setApplied(null);
                  } catch {
                    setFileError(true);
                  }
                }}
              />
            </label>
          </Button>
        </div>
        <Textarea
          id={inputId}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setApplied(null);
          }}
          rows={8}
          dir="ltr"
          spellCheck={false}
          className="font-mono text-xs"
          placeholder={"crm_unit_id,unit_number,rooms\n7006,101A,4"}
          aria-describedby={`${inputId}-hint`}
        />
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {t("pasteHint")}
        </p>
        {fileError && <FormError>{t("fileError")}</FormError>}
        {parsed && !parsed.ok && (
          <FormError>{parsed.error === "tooMany" ? t("tooMany", { count: parsed.count ?? 0 }) : t(parsed.error)}</FormError>
        )}
        {parsed?.ok && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{t("rowsParsed", { count: rows.length })}</span>
            {parsed.removed.length > 0 && (
              <span className="flex items-center gap-1.5 text-warning">
                <ShieldCheck aria-hidden className="size-4" />
                {t("priceColumnsRemoved", { columns: parsed.removed.join(", ") })}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => dryRun.mutate(rows)} disabled={!rows.length || dryRun.isPending || applied !== null}>
            {dryRun.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {dryRun.isPending ? t("checking") : t("runCheck")}
          </Button>
          {(text || result) && (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw data-icon="inline-start" />
              {tc("startOver")}
            </Button>
          )}
        </div>
        {dryRun.error && <FormError>{errorMessage(dryRun.error)}</FormError>}
      </section>

      {result && (
        <section className="grid gap-3">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["valid", result.valid, "text-success"],
                ["invalid", result.invalid.length, result.invalid.length ? "text-destructive" : ""],
                ["skipped", result.skipped.length, result.skipped.length ? "text-warning" : ""],
                ["ambiguous", result.ambiguous_matches.length, result.ambiguous_matches.length ? "text-warning" : ""],
              ] as const
            ).map(([key, value, cls]) => (
              <div key={key} className="rounded-xl border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{t(`summary.${key}`)}</dt>
                <dd className={cn("num mt-1 text-2xl font-semibold", cls)}>{formatCount(value, locale)}</dd>
              </div>
            ))}
          </dl>

          <IssueTable title={t("summary.invalid")} issues={result.invalid} tone="danger" />
          <IssueTable title={t("summary.skipped")} issues={result.skipped} tone="warning" />
          <IssueTable title={t("summary.ambiguous")} issues={result.ambiguous_matches} tone="neutral" />
          {result.ambiguous_matches.length > 0 && <p className="text-xs text-muted-foreground">{t("ambiguousNote")}</p>}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            {result.invalid.length > 0 ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <TriangleAlert aria-hidden className="size-4" />
                {t("commitBlocked")}
              </p>
            ) : applied !== null ? (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-success">
                <CircleCheck aria-hidden className="size-4" />
                {t("applied", { count: applied })}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success">
                <CircleCheck aria-hidden className="size-4" />
                {t("allValid")}
              </p>
            )}
            <Button className="ms-auto" onClick={() => commit.mutate()} disabled={!canCommit || commit.isPending}>
              {commit.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {commit.isPending ? t("committing") : t("commit", { count: result.valid })}
            </Button>
          </div>
          {commit.error && <FormError>{errorMessage(commit.error)}</FormError>}
        </section>
      )}
    </div>
  );
}
