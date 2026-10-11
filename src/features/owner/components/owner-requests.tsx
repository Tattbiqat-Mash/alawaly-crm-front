"use client";

import { Camera, ExternalLink, Loader2, Plus, RotateCcw, Star, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FileDrop } from "@/components/shared/file-drop";
import { Field } from "@/components/shared/form/field";
import { FormError, NotFoundState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, SERVICE_TYPES, type ServiceType } from "@/config/statuses";
import { PriorityBadge, ServiceStatusBadge, useServiceTypeLabel } from "@/features/service/components/service-badges";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link, useRouter } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { openSignedLink } from "@/lib/api/files";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { ownerPortalApi } from "../api";
import { REQUEST_FILTERS, useAttachPhoto, useCreateRequest, useEligibility, useFeedback, useMyRequest, useMyRequests, useMyUnits, useReopen } from "../hooks";
import { WARRANTY_CATEGORIES, notEligibleReasons, useEligibilityText } from "./eligibility";
import { OwnerCard, OwnerCardTitle, OwnerEmpty, OwnerError, OwnerFacts, OwnerList, OwnerListSkeleton, OwnerRow } from "./owner-ui";

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PHOTO_MAX = 10 * 1024 * 1024;
const FINISHED = ["completed", "closed"];

function usePhotoLabels() {
  const t = useTranslations("ownerPortal.photo");
  return { prompt: t("prompt"), hint: t("hint"), remove: t("remove"), tooLarge: t("tooLarge"), wrongType: t("wrongType") };
}

// O13 — My requests with all / open / completed chips.
export function OwnerRequestsView() {
  const t = useTranslations();
  const locale = useLocale();
  const typeLabel = useServiceTypeLabel();
  const [filter, setFilter] = useQueryState("show", parseAsStringLiteral(REQUEST_FILTERS).withDefault("all").withOptions({ history: "replace" }));
  const list = useMyRequests(filter);
  const items = [...(list.data?.items ?? [])].sort((a, b) => b.id - a.id);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div role="group" aria-label={t("ownerPortal.requests.filter")} className="flex gap-1.5">
          {REQUEST_FILTERS.map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} aria-pressed={filter === f} className="rounded-full" onClick={() => setFilter(f)}>
              {t(`ownerPortal.requests.filters.${f}`)}
            </Button>
          ))}
        </div>
        <Button asChild size="sm">
          <Link href="/owner/requests/new">
            <Plus data-icon="inline-start" />
            {t("ownerPortal.requests.new")}
          </Link>
        </Button>
      </div>
      {list.isLoading ? (
        <OwnerListSkeleton />
      ) : list.error ? (
        <OwnerError error={list.error} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <OwnerEmpty icon={Wrench} title={t("ownerPortal.requests.empty")} description={t("ownerPortal.requests.emptyHint")} />
      ) : (
        <OwnerList>
          {items.map((r) => (
            <OwnerRow
              key={r.id}
              href={`/owner/requests/${r.id}`}
              title={<span dir="auto">{r.title}</span>}
              subtitle={
                <span className="num">
                  {typeLabel(r.type)} · {formatDate(r.created_at, locale)}
                </span>
              }
              trailing={<ServiceStatusBadge status={r.status} />}
            />
          ))}
        </OwnerList>
      )}
    </div>
  );
}

// O12 — New service request or warranty claim. Kinds the unit is not eligible for are disabled with the reason.
export function OwnerNewRequestView() {
  const t = useTranslations();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const text = useEligibilityText();
  const typeLabel = useServiceTypeLabel();
  const photoLabels = usePhotoLabels();
  const params = useSearchParams();
  const units = useMyUnits();
  const create = useCreateRequest();
  const idempotency = useIdempotencyKey();

  const initialKind = params.get("kind");
  const [v, setV] = useState({
    unit: params.get("unit") ?? "",
    kind: (SERVICE_TYPES as readonly string[]).includes(initialKind ?? "") ? (initialKind as ServiceType) : ("paid" as ServiceType),
    category: params.get("category") ?? "",
    priority: "normal",
    title: "",
    description: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const unitId = v.unit ? Number(v.unit) : null;
  const eligibility = useEligibility(unitId);
  const e = eligibility.data;
  const kindAllowed = (k: ServiceType) => !e || (k === "warranty" ? e.warranty : e.after_sales);
  const categories = v.kind === "warranty" && e?.warranties.length ? [...new Set(e.warranties.map((w) => w.category))] : [...WARRANTY_CATEGORIES];
  const required = t("validation.required");
  const ok = unitId !== null && kindAllowed(v.kind) && v.category && v.title.trim();
  const reasons = notEligibleReasons(create.error ? toApiError(create.error) : null);
  const busy = create.isPending || progress !== undefined;

  // A unit is chosen in the URL (from O05/O11) or picked here; the only unit is picked for the owner.
  const onlyUnit = units.data?.items.length === 1 ? String(units.data.items[0].id) : null;
  if (!v.unit && onlyUnit) setV({ ...v, unit: onlyUnit });

  const submit = () => {
    const base = { unit_id: unitId!, category: v.category, title: v.title.trim(), ...(v.description.trim() ? { description: v.description.trim() } : {}) };
    const vars =
      v.kind === "warranty"
        ? ({ kind: "warranty", body: base, key: idempotency.key } as const)
        : ({ kind: "service", body: { ...base, type: v.kind, priority: v.priority }, key: idempotency.key } as const);
    create.mutate(vars, {
      onSuccess: async (request) => {
        idempotency.renew();
        if (photo) {
          try {
            setProgress(0);
            await ownerPortalApi.attachPhoto(request.id, photo, setProgress);
          } catch {
            toast.error(t("ownerPortal.newRequest.photoFailed"));
          }
        }
        toast.success(t("ownerPortal.newRequest.sent"));
        router.push(`/owner/requests/${request.id}`);
      },
      onError: (err) => {
        if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
      },
    });
  };

  if (units.isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (units.error) return <OwnerError error={units.error} onRetry={() => units.refetch()} />;
  if ((units.data?.items.length ?? 0) === 0) return <OwnerEmpty icon={Wrench} title={t("ownerPortal.newRequest.noUnits")} description={t("ownerPortal.units.missingHint")} />;

  return (
    <form
      className="grid gap-3.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        setSubmitted(true);
        if (ok) submit();
      }}
    >
      <OwnerCard>
        <OwnerCardTitle>{t("ownerPortal.newRequest.step1")}</OwnerCardTitle>
        <fieldset disabled={busy} className="grid gap-4">
          <Field id="nr-unit" label={t("ownerPortal.newRequest.unit")} required error={submitted && !unitId ? required : undefined}>
            <Select value={v.unit} onValueChange={(unit) => setV({ ...v, unit, category: "" })}>
              <SelectTrigger id="nr-unit" className="h-11 w-full">
                <SelectValue placeholder={t("ownerPortal.newRequest.pickUnit")} />
              </SelectTrigger>
              <SelectContent>
                {units.data!.items.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {t("units.detail.titleNumber", { number: u.unit_number ?? `#${u.id}` })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium">{t("ownerPortal.newRequest.kind")}</span>
            <div role="radiogroup" aria-label={t("ownerPortal.newRequest.kind")} className="grid grid-cols-3 gap-2">
              {SERVICE_TYPES.map((k) => {
                const allowed = kindAllowed(k);
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={v.kind === k}
                    disabled={!allowed}
                    onClick={() => setV({ ...v, kind: k, category: "" })}
                    className={cn(
                      "min-h-11 rounded-xl border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                      v.kind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    {typeLabel(k)}
                  </button>
                );
              })}
            </div>
            {eligibility.isLoading && unitId !== null && <Skeleton className="h-4 w-40" />}
            {e && e.reasons.length > 0 && <p className="text-xs text-muted-foreground">{e.reasons.map(text.reason).join(" · ")}</p>}
            {!kindAllowed(v.kind) && <p className="text-xs text-destructive">{t("ownerPortal.newRequest.kindNotAllowed")}</p>}
          </div>
        </fieldset>
      </OwnerCard>

      <OwnerCard>
        <OwnerCardTitle>{t("ownerPortal.newRequest.step2")}</OwnerCardTitle>
        <fieldset disabled={busy} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nr-category" label={t("ownerPortal.newRequest.category")} required error={submitted && !v.category ? required : undefined}>
              <Select value={v.category} onValueChange={(category) => setV({ ...v, category })}>
                <SelectTrigger id="nr-category" className="h-11 w-full">
                  <SelectValue placeholder={t("ownerPortal.newRequest.category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {text.category(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {v.kind !== "warranty" && (
              <Field id="nr-priority" label={t("ownerPortal.newRequest.priority")}>
                <Select value={v.priority} onValueChange={(priority) => setV({ ...v, priority })}>
                  <SelectTrigger id="nr-priority" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`statuses.priority.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <Field id="nr-title" label={t("ownerPortal.newRequest.title")} required error={submitted && !v.title.trim() ? required : undefined}>
            <Input id="nr-title" className="h-11" dir="auto" maxLength={160} value={v.title} onChange={(ev) => setV({ ...v, title: ev.target.value })} />
          </Field>
          <Field id="nr-description" label={t("ownerPortal.newRequest.description")}>
            <Textarea id="nr-description" rows={3} dir="auto" value={v.description} onChange={(ev) => setV({ ...v, description: ev.target.value })} />
          </Field>
        </fieldset>
      </OwnerCard>

      <OwnerCard>
        <OwnerCardTitle icon={Camera}>{t("ownerPortal.newRequest.step3")}</OwnerCardTitle>
        <FileDrop accept={PHOTO_TYPES} maxBytes={PHOTO_MAX} value={photo} onChange={setPhoto} progress={progress} disabled={busy} labels={photoLabels} />
      </OwnerCard>

      {create.error && (
        <FormError>
          {reasons ? (
            <>
              {t("ownerPortal.newRequest.notEligible")} {reasons.map(text.reason).join(" · ")}
            </>
          ) : (
            errorMessage(create.error)
          )}
        </FormError>
      )}
      <Button type="submit" className="h-12 text-base" disabled={busy}>
        {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {t("ownerPortal.newRequest.submit")}
      </Button>
    </form>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useTranslations("ownerPortal.request");
  return (
    <div role="radiogroup" aria-label={t("rating")} className="flex justify-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={t("stars", { count: n })} className="grid size-11 place-items-center rounded-lg hover:bg-muted" onClick={() => onChange(n)}>
          <Star className={cn("size-7", n <= value ? "fill-warning text-warning" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function FeedbackCard({ requestId }: { requestId: number }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const feedback = useFeedback(requestId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const given = feedback.error && toApiError(feedback.error).code === "FEEDBACK_ALREADY_GIVEN";
  return (
    <OwnerCard>
      <OwnerCardTitle icon={Star}>{t("ownerPortal.request.rateTitle")}</OwnerCardTitle>
      <form
        className="grid gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!rating) return;
          feedback.mutate({ rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }, { onSuccess: () => toast.success(t("ownerPortal.request.thanks")) });
        }}
      >
        <Stars value={rating} onChange={setRating} />
        <Textarea aria-label={t("ownerPortal.request.comment")} placeholder={t("ownerPortal.request.comment")} rows={2} dir="auto" value={comment} onChange={(ev) => setComment(ev.target.value)} />
        {feedback.error && <FormError>{given ? t("ownerPortal.request.alreadyRated") : errorMessage(feedback.error)}</FormError>}
        <Button type="submit" className="h-11" disabled={!rating || feedback.isPending}>
          {feedback.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {t("ownerPortal.request.sendRating")}
        </Button>
      </form>
    </OwnerCard>
  );
}

function AddPhoto({ requestId }: { requestId: number }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const labels = usePhotoLabels();
  const attach = useAttachPhoto(requestId);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | undefined>();
  return (
    <div className="grid gap-2">
      <FileDrop accept={PHOTO_TYPES} maxBytes={PHOTO_MAX} value={file} onChange={setFile} progress={progress} disabled={attach.isPending} labels={labels} />
      {file && (
        <Button
          className="h-11"
          disabled={attach.isPending}
          onClick={() =>
            attach.mutate(
              { file, onProgress: setProgress },
              {
                onSuccess: () => {
                  toast.success(t("ownerPortal.request.photoAdded"));
                  setFile(null);
                },
                onSettled: () => setProgress(undefined),
              },
            )
          }
        >
          {attach.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {t("ownerPortal.request.uploadPhoto")}
        </Button>
      )}
      {attach.error && <FormError>{errorMessage(attach.error)}</FormError>}
    </div>
  );
}

// O14 — Request detail: timeline, visits, photos, rating and reopen.
export function OwnerRequestDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const typeLabel = useServiceTypeLabel();
  const text = useEligibilityText();
  const query = useMyRequest(id);
  const reopen = useReopen(id);
  const [reopening, setReopening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  if (query.isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (query.error) {
    if (toApiError(query.error).code === "NOT_FOUND")
      return (
        <OwnerCard className="p-0">
          <NotFoundState compact />
        </OwnerCard>
      );
    return <OwnerError error={query.error} onRetry={() => query.refetch()} />;
  }
  const r = query.data!;
  const finished = FINISHED.includes(r.status);
  const events = r.events ?? [];
  const visits = (r.visits ?? []).filter((x) => x.scheduled_at);
  const attachments = r.attachments ?? [];
  const nextVisit = visits.find((x) => x.status !== "cancelled" && x.status !== "done");

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold" dir="auto">
            {r.title}
          </p>
          <ServiceStatusBadge status={r.status} />
        </div>
        {r.description && (
          <p className="mt-1 text-sm text-muted-foreground" dir="auto">
            {r.description}
          </p>
        )}
        <div className="mt-3">
          <OwnerFacts
            items={[
              [t("serviceRequest.fields.type"), typeLabel(r.type)],
              [t("serviceRequest.fields.priority"), <PriorityBadge key="p" priority={r.priority} />],
              [t("serviceRequest.fields.category"), text.category(r.category)],
              [t("ownerPortal.request.visit"), <span key="v" className="num">{nextVisit ? formatDateTime(nextVisit.scheduled_at, locale) : t("ownerPortal.request.noVisit")}</span>],
            ]}
          />
        </div>
        {r.reject_reason && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm" dir="auto">
            {t("serviceRequest.fields.rejectReason")}: {r.reject_reason}
          </p>
        )}
      </OwnerCard>

      {events.length > 0 && (
        <OwnerCard>
          <OwnerCardTitle>{t("serviceRequest.sections.timeline")}</OwnerCardTitle>
          <ol className="relative grid gap-3 border-s ps-4">
            {events.map((ev, i) => (
              <li key={i} className="relative text-sm">
                <span aria-hidden className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                <p className="font-medium">
                  {ev.event === "created" ? t("ownerPortal.request.created") : ev.to_status ? <ServiceStatusBadge status={ev.to_status} /> : ev.event}
                </p>
                <p className="num text-xs text-muted-foreground">{formatDateTime(ev.created_at, locale)}</p>
              </li>
            ))}
          </ol>
        </OwnerCard>
      )}

      <OwnerCard>
        <OwnerCardTitle icon={Camera}>{t("serviceRequest.sections.attachments")}</OwnerCardTitle>
        {attachments.length > 0 && (
          <ul className="mb-3 grid gap-1.5">
            {attachments.map((a) => (
              <li key={a.id}>
                <Button
                  variant="ghost"
                  className="h-11 w-full justify-between"
                  onClick={() => {
                    setOpenError(null);
                    openSignedLink(() => ownerPortalApi.attachmentLink(id, a.id)).catch((err) => setOpenError(errorMessage(err)));
                  }}
                >
                  <span className="truncate" dir="ltr">
                    {a.original_name}
                  </span>
                  <ExternalLink className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {openError && <FormError>{openError}</FormError>}
        {r.status !== "closed" && r.status !== "rejected" ? <AddPhoto requestId={id} /> : attachments.length === 0 && <p className="text-sm text-muted-foreground">{t("serviceRequest.noAttachments")}</p>}
      </OwnerCard>

      {finished && r.rating === null && <FeedbackCard requestId={id} />}
      {r.rating !== null && (
        <OwnerCard>
          <OwnerCardTitle icon={Star}>{t("ownerPortal.request.yourRating")}</OwnerCardTitle>
          <p className="num text-sm">
            {"★".repeat(r.rating)}
            {"☆".repeat(Math.max(0, 5 - r.rating))}
          </p>
          {r.feedback && (
            <p className="mt-1 text-sm text-muted-foreground" dir="auto">
              {r.feedback}
            </p>
          )}
        </OwnerCard>
      )}

      {finished && (
        <Button variant="outline" className="h-11" onClick={() => setReopening(true)}>
          <RotateCcw data-icon="inline-start" />
          {t("ownerPortal.request.reopen")}
        </Button>
      )}
      <ConfirmDialog
        open={reopening}
        onOpenChange={(o) => {
          setReopening(o);
          if (!o) reopen.reset();
        }}
        title={t("ownerPortal.request.reopenTitle")}
        consequence={t("ownerPortal.request.reopenBody")}
        confirmLabel={t("ownerPortal.request.reopen")}
        requireReason
        pending={reopen.isPending}
        error={reopen.error ? errorMessage(reopen.error) : undefined}
        onConfirm={(reason) =>
          reopen.mutate(reason, {
            onSuccess: () => {
              toast.success(t("ownerPortal.request.reopened"));
              setReopening(false);
            },
          })
        }
      />
    </div>
  );
}
