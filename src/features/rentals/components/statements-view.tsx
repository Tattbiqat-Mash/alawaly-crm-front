"use client";

import { FileText, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FilterBar } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { EmptyState, ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { formatDate, formatDateTime, todayIso } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { Statement } from "../api";
import { useGenerateStatement, useMandate, useMandatePick, useStatements } from "../hooks";
import { MandatePicker, MandateScopeBanner, mandateAllows } from "./rental-shared";

const KPIS = ["expected", "collected", "outstanding", "overdue", "waived"] as const;

/** Totals arrive as numbers (D5); formatMoney accepts both and never uses float math. */
function Totals({ statement, highlight }: { statement: Statement; highlight?: boolean }) {
  const t = useTranslations("statements");
  const locale = useLocale();
  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:grid-cols-5", highlight && "gap-3")}>
      {KPIS.map((k) => (
        <div key={k} className={cn("rounded-lg border bg-card p-2.5", highlight && "p-3")}>
          <dt className="text-xs text-muted-foreground">{t(`kpi.${k}`)}</dt>
          <dd className={cn("num mt-0.5 font-semibold", highlight ? "text-lg" : "text-sm", k === "overdue" && Number(statement.totals[k]) > 0 && "text-destructive")}>
            {formatMoney(statement.totals[k], locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// S35 — Owner statements (needs the view_statements capability).
export function StatementsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const [state, setState] = useMandatePick();
  const mandate = useMandate(state.mandate);
  const statements = useStatements(state.mandate);
  const generate = useGenerateStatement(state.mandate ?? 0);
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayIso());
  const [latest, setLatest] = useState<Statement | null>(null);
  const allowed = mandateAllows(mandate.data, "view_statements");

  return (
    <div className="grid gap-4">
      <FilterBar>
        <MandatePicker value={state.mandate} onChange={(m) => { setLatest(null); setState({ mandate: m }); }} />
      </FilterBar>
      {state.mandate === null ? (
        <div className="rounded-xl border bg-card">
          <EmptyState compact title={t("rentals.pickMandate")} />
        </div>
      ) : (
        <>
          {mandate.data && <MandateScopeBanner mandate={mandate.data} capability="view_statements" error={statements.error ?? generate.error} />}
          {can("rental.manage") && allowed && (
            <form
              className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
              onSubmit={(e) => {
                e.preventDefault();
                generate.mutate(
                  { period_start: from, period_end: to },
                  {
                    onSuccess: (s) => {
                      setLatest(s);
                      toast.success(t("statements.generated"));
                    },
                  },
                );
              }}
            >
              <Field id="st-from" label={t("statements.from")}>
                <Input id="st-from" type="date" dir="ltr" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field id="st-to" label={t("statements.to")}>
                <Input id="st-to" type="date" dir="ltr" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Button type="submit" disabled={!from || !to || generate.isPending}>
                {generate.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <FileText data-icon="inline-start" />}
                {generate.isPending ? t("statements.generating") : t("statements.generate")}
              </Button>
              <p className="w-full text-xs text-muted-foreground">{t("statements.refreshNote")}</p>
              {generate.error && <FormError>{errorMessage(generate.error)}</FormError>}
            </form>
          )}
          {latest && (
            <section className="grid gap-2">
              <h2 className="num text-sm font-medium">{t("statements.period", { from: formatDate(latest.period_start, locale), to: formatDate(latest.period_end, locale) })}</h2>
              <Totals statement={latest} highlight />
            </section>
          )}
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">{t("statements.previous")}</h2>
            {statements.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : statements.error ? (
              <ErrorState compact error={statements.error} onRetry={() => statements.refetch()} />
            ) : (statements.data?.items ?? []).length === 0 ? (
              <div className="rounded-xl border bg-card">
                <EmptyState compact title={t("statements.empty")} />
              </div>
            ) : (
              <ul className="grid gap-3">
                {(statements.data?.items ?? []).map((s) => (
                  <li key={s.id} className="grid gap-2 rounded-xl border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="num font-medium">{t("statements.period", { from: formatDate(s.period_start, locale), to: formatDate(s.period_end, locale) })}</span>
                      <span className="num text-xs text-muted-foreground">{t("statements.generatedAt", { date: formatDateTime(s.generated_at, locale) })}</span>
                    </div>
                    <Totals statement={s} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
