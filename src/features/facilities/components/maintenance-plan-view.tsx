"use client";

import { Loader2, Pause, Play, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAllResources } from "@/features/maintenance/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate, todayIso } from "@/lib/format/dates";
import { isOn, localizedName } from "@/lib/format/localized";
import { TASK_STATUSES, type PmSchedule, type PmTask } from "../api";
import { useAllAssets, useAllSchedules, usePlanState, useSaveSchedule, useSchedules, useTaskAction, useTasks } from "../hooks";
import { TaskStatusBadge } from "./facility-badges";

/** Complete (notes optional) or skip (a note is required) a task. */
function NotesDialog({ task, action, onClose }: { task: PmTask; action: "complete" | "skip"; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const act = useTaskAction();
  const [notes, setNotes] = useState("");
  const required = action === "skip";
  const [submitted, setSubmitted] = useState(false);
  const error = submitted && required && !notes.trim() ? t("maintenancePlan.notesRequired") : undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (required && !notes.trim()) return;
            act.mutate(
              { id: task.id, action, notes: notes.trim() || undefined },
              {
                onSuccess: () => {
                  toast.success(t("maintenancePlan.done"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{action === "skip" ? t("maintenancePlan.skipTitle", { id: task.id }) : t("maintenancePlan.completeTitle", { id: task.id })}</DialogTitle>
          </DialogHeader>
          <Field id="task-notes" label={t("maintenancePlan.notes")} required={required} error={error}>
            <Textarea id="task-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-invalid={error ? true : undefined} />
          </Field>
          {act.error && <FormError>{errorMessage(act.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant={action === "skip" ? "outline" : "default"} disabled={act.isPending}>
              {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {action === "skip" ? t("maintenancePlan.skip") : t("maintenancePlan.complete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleSheet({ schedule, onClose }: { schedule?: PmSchedule; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const assets = useAllAssets();
  const teams = useAllResources("teams", ["maint.manage", "facility.manage"]);
  const save = useSaveSchedule();
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({
    asset_id: schedule ? String(schedule.asset_id) : "",
    title: schedule?.title ?? "",
    frequency_days: schedule ? String(schedule.frequency_days) : "",
    next_due_on: schedule?.next_due_on ?? todayIso(),
    team_id: schedule?.team_id ? String(schedule.team_id) : "none",
    active: schedule ? isOn(schedule.active) : true,
  });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  const freqOk = /^\d+$/.test(v.frequency_days) && Number(v.frequency_days) >= 1;
  const err = {
    asset: submitted && !v.asset_id ? required : undefined,
    title: submitted && !v.title.trim() ? required : undefined,
    freq: submitted && !freqOk ? t("maintenancePlan.frequencyInvalid") : undefined,
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={schedule ? t("maintenancePlan.editSchedule") : t("maintenancePlan.newSchedule")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!v.asset_id || !v.title.trim() || !freqOk) return;
        const body = {
          asset_id: Number(v.asset_id),
          title: v.title.trim(),
          frequency_days: Number(v.frequency_days),
          next_due_on: v.next_due_on || null,
          team_id: v.team_id === "none" ? null : Number(v.team_id),
          active: v.active,
        };
        save.mutate(
          { id: schedule?.id ?? null, body, key: idempotency.key },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(schedule ? t("maintenancePlan.saved") : t("maintenancePlan.created"));
              onClose();
            },
            onError: (e) => {
              if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
            },
          },
        );
      }}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {schedule ? t("common.save") : t("common.create")}
          </Button>
        </>
      }
    >
      <fieldset disabled={save.isPending} className="grid gap-4">
        <Field id="sc-asset" label={t("maintenancePlan.fields.asset")} required error={err.asset}>
          <Select value={v.asset_id} onValueChange={(asset_id) => setV({ ...v, asset_id })}>
            <SelectTrigger id="sc-asset" className="w-full" aria-invalid={err.asset ? true : undefined}>
              <SelectValue placeholder={t("maintenancePlan.fields.asset")} />
            </SelectTrigger>
            <SelectContent>
              {(assets.data ?? []).filter((a) => a.status !== "retired").map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="sc-title" label={t("maintenancePlan.fields.title")} required error={err.title}>
          <Input id="sc-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-invalid={err.title ? true : undefined} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sc-freq" label={t("maintenancePlan.fields.frequency")} required error={err.freq}>
            <Input id="sc-freq" inputMode="numeric" dir="ltr" value={v.frequency_days} onChange={(e) => setV({ ...v, frequency_days: e.target.value.replace(/\D/g, "") })} aria-invalid={err.freq ? true : undefined} />
          </Field>
          <Field id="sc-next" label={t("maintenancePlan.fields.nextDue")}>
            <Input id="sc-next" type="date" dir="ltr" value={v.next_due_on} onChange={(e) => setV({ ...v, next_due_on: e.target.value })} />
          </Field>
        </div>
        <Field id="sc-team" label={t("maintenancePlan.fields.team")}>
          <Select value={v.team_id} onValueChange={(team_id) => setV({ ...v, team_id })}>
            <SelectTrigger id="sc-team" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {(teams.data ?? []).map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {localizedName(team, locale) || `#${team.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-start gap-2">
          <Checkbox id="sc-active" checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c === true })} />
          <Label htmlFor="sc-active" className="leading-snug">
            {t("maintenancePlan.fields.active")}
          </Label>
        </div>
      </fieldset>
      {save.error && <FormError>{errorMessage(save.error)}</FormError>}
    </FormSheet>
  );
}

// S29 — Maintenance plan: tasks (generated from schedules) and schedules.
export function MaintenancePlanView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const [state, setState] = usePlanState();
  const tasks = useTasks(state, state.tab === "tasks");
  const schedules = useSchedules(state, state.tab === "schedules");
  const allSchedules = useAllSchedules();
  const assets = useAllAssets();
  const teams = useAllResources("teams", ["maint.manage", "facility.manage"]);
  const act = useTaskAction();
  const pause = useSaveSchedule();
  const [notesFor, setNotesFor] = useState<{ task: PmTask; action: "complete" | "skip" } | null>(null);
  const [sheet, setSheet] = useState<null | "new" | PmSchedule>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const assetName = useMemo(() => {
    const map = new Map((assets.data ?? []).map((a) => [a.id, a.name]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [assets.data]);
  const scheduleTitle = useMemo(() => {
    const map = new Map((allSchedules.data ?? []).map((s) => [s.id, s.title]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [allSchedules.data]);
  const teamName = useMemo(() => {
    const map = new Map((teams.data ?? []).map((x) => [x.id, x]));
    return (id: number | null) => (id === null ? "—" : localizedName(map.get(id), locale) || `#${id}`);
  }, [teams.data, locale]);

  const taskColumns: Column<PmTask>[] = [
    { id: "due", header: t("maintenancePlan.columns.due"), cell: (x) => <span className="num">{formatDate(x.due_on, locale)}</span> },
    { id: "asset", header: t("maintenancePlan.columns.asset"), cell: (x) => assetName(x.asset_id) },
    { id: "task", header: t("maintenancePlan.columns.task"), cell: (x) => scheduleTitle(x.pm_schedule_id) },
    { id: "status", header: t("maintenancePlan.columns.status"), cell: (x) => <TaskStatusBadge status={x.status} /> },
    {
      id: "actions",
      header: t("maintenancePlan.columns.actions"),
      cell: (x) =>
        x.status === "open" || x.status === "in_progress" ? (
          <div className="flex gap-1.5">
            {x.status === "open" && (
              <Button
                size="sm"
                variant="outline"
                disabled={act.isPending}
                onClick={() => act.mutate({ id: x.id, action: "start" }, { onSuccess: () => toast.success(t("maintenancePlan.done")) })}
              >
                {t("maintenancePlan.start")}
              </Button>
            )}
            <Button size="sm" onClick={() => setNotesFor({ task: x, action: "complete" })}>
              {t("maintenancePlan.complete")}
            </Button>
            {x.status === "open" && (
              <Button size="sm" variant="ghost" onClick={() => setNotesFor({ task: x, action: "skip" })}>
                {t("maintenancePlan.skip")}
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  const scheduleColumns: Column<PmSchedule>[] = [
    { id: "title", header: t("maintenancePlan.columns.title"), cell: (x) => <span className="font-medium">{x.title}</span> },
    { id: "asset", header: t("maintenancePlan.columns.asset"), cell: (x) => assetName(x.asset_id) },
    { id: "frequency", header: t("maintenancePlan.columns.frequency"), cell: (x) => t("maintenancePlan.everyDays", { days: x.frequency_days }) },
    { id: "next", header: t("maintenancePlan.columns.nextDue"), cell: (x) => <span className="num">{formatDate(x.next_due_on, locale)}</span> },
    { id: "team", header: t("maintenancePlan.columns.team"), cell: (x) => teamName(x.team_id) },
    {
      id: "active",
      header: t("maintenancePlan.columns.active"),
      cell: (x) => (
        <div className="flex items-center gap-2">
          {isOn(x.active) ? <StatusBadge tone="success">{t("common.active")}</StatusBadge> : <StatusBadge tone="warning">{t("maintenancePlan.paused")}</StatusBadge>}
          <Button
            size="sm"
            variant="ghost"
            disabled={pause.isPending}
            onClick={(e) => {
              e.stopPropagation();
              pause.mutate({ id: x.id, body: { active: !isOn(x.active) }, key: "" });
            }}
          >
            {isOn(x.active) ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {isOn(x.active) ? t("maintenancePlan.pause") : t("maintenancePlan.resume")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Tabs value={state.tab} onValueChange={(tab) => setState({ tab, page: 1 })} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="tasks">{t("maintenancePlan.tabs.tasks")}</TabsTrigger>
          <TabsTrigger value="schedules">{t("maintenancePlan.tabs.schedules")}</TabsTrigger>
        </TabsList>
        {state.tab === "schedules" && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("maintenancePlan.newSchedule")}
          </Button>
        )}
      </div>
      {(act.error || pause.error) && <FormError>{errorMessage(act.error ?? pause.error)}</FormError>}
      <TabsContent value="tasks" className="flex min-h-0 flex-1 flex-col gap-3">
        <FilterBar>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
            <Checkbox id="overdue-only" checked={state.overdue} onCheckedChange={(v) => set({ overdue: v === true })} />
            <Label htmlFor="overdue-only" className="text-sm">
              {t("maintenancePlan.overdueOnly")}
            </Label>
          </div>
          <FilterSelect
            label={t("maintenancePlan.columns.status")}
            value={state.status}
            onChange={(v) => set({ status: v })}
            options={TASK_STATUSES.map((s) => ({ value: s, label: t(`statuses.task.${s}`) }))}
          />
          <FilterSelect
            label={t("maintenancePlan.columns.asset")}
            value={state.asset}
            onChange={(v) => set({ asset: v })}
            options={(assets.data ?? []).map((a) => ({ value: String(a.id), label: a.name }))}
          />
          <ResetFilters
            count={[!state.overdue, state.status, state.asset].filter(Boolean).length}
            onReset={() => setState({ overdue: true, status: null, asset: null, page: 1 })}
          />
        </FilterBar>
        <DataTable
          caption={t("maintenancePlan.tabs.tasks")}
          columns={taskColumns}
          rows={tasks.data?.items}
          getRowId={(x) => x.id}
          isLoading={tasks.isLoading}
          isFetching={tasks.isFetching}
          error={tasks.error}
          onRetry={() => tasks.refetch()}
          pagination={paginationProps(tasks.data?.meta, setState)}
          empty={<EmptyState compact title={t("maintenancePlan.empty")} />}
        />
      </TabsContent>
      <TabsContent value="schedules" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("maintenancePlan.tabs.schedules")}
          columns={scheduleColumns}
          rows={schedules.data?.items}
          getRowId={(x) => x.id}
          getRowLabel={(x) => x.title}
          isLoading={schedules.isLoading}
          isFetching={schedules.isFetching}
          error={schedules.error}
          onRetry={() => schedules.refetch()}
          onRowClick={(x) => setSheet(x)}
          pagination={paginationProps(schedules.data?.meta, setState)}
          empty={<EmptyState compact title={t("maintenancePlan.emptySchedules")} />}
        />
      </TabsContent>
      {notesFor && <NotesDialog task={notesFor.task} action={notesFor.action} onClose={() => setNotesFor(null)} />}
      {sheet !== null && <ScheduleSheet key={sheet === "new" ? "new" : sheet.id} schedule={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} />}
    </Tabs>
  );
}
