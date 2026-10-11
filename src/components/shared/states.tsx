"use client";

import { FileQuestion, Inbox, RotateCcw, Settings2, ShieldOff, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type StatePanelProps = {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
  /** Inline variant for cards, tabs and table bodies. */
  compact?: boolean;
  className?: string;
};

export function StatePanel({ icon: Icon, title, description, action, tone = "neutral", compact, className }: StatePanelProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2.5 px-4 py-8" : "gap-3.5 px-6 py-14",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-xl ring-1 shadow-2xs transition-transform",
          compact ? "size-10" : "size-12.5",
          tone === "neutral" && "bg-muted/80 text-muted-foreground ring-border/60",
          tone === "warning" && "bg-warning/10 text-warning ring-warning/20",
          tone === "danger" && "bg-destructive/10 text-destructive ring-destructive/20",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </span>
      <p className={cn("font-semibold tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && <div className="max-w-md text-xs leading-relaxed text-muted-foreground md:text-sm">{description}</div>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function EmptyState(props: Omit<StatePanelProps, "icon"> & { icon?: LucideIcon }) {
  return <StatePanel icon={props.icon ?? Inbox} {...props} />;
}

export function ForbiddenState({ compact }: { compact?: boolean }) {
  const t = useTranslations("errors.forbidden");
  return <StatePanel icon={ShieldOff} title={t("title")} description={t("body")} compact={compact} />;
}

export function NotFoundState({ compact, action }: { compact?: boolean; action?: ReactNode }) {
  const t = useTranslations("errors.notFound");
  return <StatePanel icon={FileQuestion} title={t("title")} description={t("body")} compact={compact} action={action} />;
}

/**
 * 409 POLICY_NOT_CONFIGURED: the business has not decided a setting yet. Calm, no retry,
 * and the feature stays visible.
 */
export function NotConfiguredState({ details, compact }: { details?: Record<string, unknown>; compact?: boolean }) {
  const t = useTranslations("errors.notConfigured");
  const policy = typeof details?.policy === "string" ? details.policy : null;
  const decision = typeof details?.decision === "string" ? details.decision : null;
  return (
    <StatePanel
      icon={Settings2}
      tone="warning"
      compact={compact}
      title={t("title")}
      description={
        <>
          <p>{t("body")}</p>
          {(policy || decision) && (
            <p className="mt-2 font-mono text-xs" dir="ltr">
              {policy && t("policy", { policy })}
              {policy && decision && " · "}
              {decision && t("decision", { decision })}
            </p>
          )}
        </>
      }
    />
  );
}

/** Picks the right state for any API error: forbidden, not configured, not found, offline or failure. */
export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const t = useTranslations();
  const message = useErrorMessage();
  const e = toApiError(error);

  if (e.code === "FORBIDDEN" || (e.status === 403 && e.code !== "MANDATE_SCOPE")) return <ForbiddenState compact={compact} />;
  if (e.code === "POLICY_NOT_CONFIGURED") return <NotConfiguredState details={e.details} compact={compact} />;
  if (e.code === "NOT_FOUND") return <NotFoundState compact={compact} />;

  const canRetry = onRetry && (e.isNetwork || e.status >= 500 || e.status === 429);
  return (
    <StatePanel
      icon={e.isNetwork ? WifiOff : TriangleAlert}
      tone="danger"
      compact={compact}
      title={message(e)}
      description={e.correlationId ? <span dir="ltr">{t("errors.correlation", { id: e.correlationId })}</span> : undefined}
      action={
        canRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" />
            {t("common.retry")}
          </Button>
        ) : undefined
      }
    />
  );
}

/** Inline form-level error (inside dialogs and sheets). */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
