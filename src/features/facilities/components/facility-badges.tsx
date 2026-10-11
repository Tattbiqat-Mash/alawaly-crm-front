"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type Tone } from "@/components/shared/status-badge";
import { ASSET_STATUSES, INCIDENT_STATUSES, TASK_STATUSES } from "../api";

const assetTone: Record<(typeof ASSET_STATUSES)[number], Tone> = { in_service: "success", out_of_service: "warning", retired: "neutral" };
const taskTone: Record<(typeof TASK_STATUSES)[number], Tone> = { open: "warning", in_progress: "info", done: "success", skipped: "neutral" };
const incidentTone: Record<(typeof INCIDENT_STATUSES)[number], Tone> = { open: "danger", investigating: "warning", resolved: "success", closed: "neutral" };

function makeBadge<K extends string>(values: readonly K[], tones: Record<K, Tone>, ns: "statuses.asset" | "statuses.task" | "statuses.incident") {
  return function Badge({ status }: { status: string }) {
    const t = useTranslations(ns);
    return values.includes(status as K) ? <StatusBadge tone={tones[status as K]}>{t(status as never)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
  };
}

export const AssetStatusBadge = makeBadge(ASSET_STATUSES, assetTone, "statuses.asset");
export const TaskStatusBadge = makeBadge(TASK_STATUSES, taskTone, "statuses.task");
export const IncidentStatusBadge = makeBadge(INCIDENT_STATUSES, incidentTone, "statuses.incident");
