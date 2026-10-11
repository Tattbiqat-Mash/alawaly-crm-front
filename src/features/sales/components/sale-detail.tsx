"use client";

import { ArrowRight, Check, Loader2, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SALE_FLOW } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useCancelSale, useSale, useTransitionSale } from "../hooks";
import type { Sale } from "../types";
import { SaleStatusBadge } from "./badges";
import { DocumentsTab, HandoverTab, InstallmentsTab, PaymentsTab, WarrantyTab } from "./sale-tabs";

const TABS = ["installments", "documents", "handover", "warranty", "payments"] as const;
type Next = (typeof SALE_FLOW)[number];

function Stepper({ status }: { status: string }) {
  const t = useTranslations("sale.steps");
  const current = SALE_FLOW.indexOf(status as Next);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {SALE_FLOW.map((step, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                done && "border-success/30 bg-success/10 text-success",
                active && "border-primary/40 bg-primary/10 text-primary",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done && <Check aria-hidden className="size-3" />}
              {t(step)}
            </span>
            {i < SALE_FLOW.length - 1 && <ArrowRight aria-hidden className="size-3 text-muted-foreground rtl:rotate-180" />}
          </li>
        );
      })}
    </ol>
  );
}

function Facts({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const items: [string, React.ReactNode][] = [
    [
      t("sale.fields.unit"),
      <Link key="u" href={`/units/${sale.unit_id}`} className="text-primary hover:underline">
        {t("common.unitRef", { id: sale.unit_id })}
      </Link>,
    ],
    [t("sale.fields.client"), t("common.clientRef", { id: sale.client_id })],
    [t("sale.fields.reservation"), sale.reservation_id ? `#${sale.reservation_id}` : "—"],
    [t("sale.fields.price"), <span key="p" className="num font-semibold">{formatMoney(sale.price_agreed, locale)}</span>],
    [t("sale.fields.basis"), sale.price_basis ?? "—"],
    [t("sale.fields.sold"), <span key="s" className="num">{formatDate(sale.sold_at, locale)}</span>],
    [t("sale.fields.contracted"), <span key="c" className="num">{formatDate(sale.contracted_at, locale)}</span>],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 md:grid-cols-4 xl:grid-cols-7">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 truncate text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// S15 — Sale detail.
export function SaleDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const query = useSale(id);
  const transition = useTransitionSale(id);
  const cancel = useCancelSale(id);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("installments").withOptions({ history: "replace" }));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundReview, setRefundReview] = useState<string | number | null>(null);

  const crumbs = [{ label: t("nav.groups.sales") }, { label: t("nav.items.sales"), href: "/sales" }, { label: `#${id}` }];

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.error || !query.data) {
    return (
      <>
        <PageHeader title={t("sale.title", { id })} breadcrumbs={crumbs} breadcrumbsLabel={t("common.breadcrumbs")} />
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </>
    );
  }

  const sale = query.data;
  const index = SALE_FLOW.indexOf(sale.status as Next);
  const next: Next | undefined = index >= 0 ? SALE_FLOW[index + 1] : undefined;
  const cancelled = sale.status === "cancelled";
  const canCancel = can("sales.cancel") && !cancelled && sale.status !== "handed_over";

  return (
    <>
      <PageHeader
        title={t("sale.title", { id })}
        breadcrumbs={crumbs}
        breadcrumbsLabel={t("common.breadcrumbs")}
        meta={<SaleStatusBadge status={sale.status} />}
        actions={
          <>
            {canCancel && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOpen(true)}>
                <XCircle data-icon="inline-start" />
                {t("sale.cancel")}
              </Button>
            )}
            {next && can("sales.manage") && (
              <Button
                disabled={transition.isPending}
                onClick={() =>
                  transition.mutate(next, {
                    onSuccess: () => toast.success(t("sale.advanced", { status: t(`sale.steps.${next}`) })),
                  })
                }
              >
                {transition.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {t(`sale.advance.${next as Exclude<Next, "draft">}`)}
              </Button>
            )}
          </>
        }
      />

      {cancelled ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("sale.cancelledInfo", { date: formatDateTime(sale.cancelled_at, locale), reason: sale.cancel_reason ?? "—" })}
        </p>
      ) : (
        <Stepper status={sale.status} />
      )}
      {/* CONTRACT_DOCUMENT_REQUIRED, PAYMENTS_OUTSTANDING, HANDOVER_NOT_ACCEPTED… shown where the action is. */}
      {transition.error && <FormError>{errorMessage(transition.error)}</FormError>}
      {refundReview !== null && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("sale.refundReview", { amount: formatMoney(refundReview, locale) })}
        </p>
      )}

      <Facts sale={sale} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number])} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`sale.tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="installments">
          <InstallmentsTab sale={sale} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab sale={sale} />
        </TabsContent>
        <TabsContent value="handover">
          <HandoverTab sale={sale} />
        </TabsContent>
        <TabsContent value="warranty">
          <WarrantyTab sale={sale} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab sale={sale} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => {
          setCancelOpen(o);
          if (!o) cancel.reset();
        }}
        title={t("sale.cancelTitle", { id })}
        consequence={t("sale.cancelBody")}
        confirmLabel={t("sale.cancel")}
        destructive
        requireReason
        pending={cancel.isPending}
        error={cancel.error ? errorMessage(cancel.error) : undefined}
        onConfirm={(reason) =>
          cancel.mutate(reason, {
            onSuccess: (r) => {
              toast.success(t("sale.cancelled"));
              setRefundReview(r.paid_total_to_review_for_refund);
              setCancelOpen(false);
            },
          })
        }
      />
    </>
  );
}
