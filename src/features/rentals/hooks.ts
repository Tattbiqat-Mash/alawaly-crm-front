"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { rentalsApi } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged, sort = "-id") => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? sort });

function useRentalMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>, keys: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

// ---------- mandates (S31) ----------

export const useMandatesState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, mode: parseAsString, unit: parseAsString, open: parseAsInteger }, { history: "replace" });

export function useMandates(s: Paged & { status: string | null; mode: string | null; unit: string | null }) {
  const params = { ...paging(s), filter: { status: s.status, mode: s.mode, unit_id: s.unit } };
  return useQuery({ queryKey: ["mandates", params], queryFn: () => rentalsApi.mandates(params), placeholderData: keepPreviousData });
}

/** All mandates (100 max) for the mandate pickers on S32–S35. */
export const useAllMandates = () =>
  useQuery({ queryKey: ["mandates", "all"], queryFn: () => rentalsApi.mandates({ pageSize: 100, sort: "-id" }).then((p) => p.items), staleTime: 60_000 });

export const useMandate = (id: number | null) =>
  useQuery({ queryKey: ["mandates", "one", id], queryFn: () => rentalsApi.mandate(id!), enabled: id !== null });

export const useCreateMandate = () =>
  useRentalMutation(({ body, key }: { body: Record<string, unknown>; key: string }) => rentalsApi.createMandate(body, key), ["mandates"]);
export const useMandateAction = () =>
  useRentalMutation(({ id, action }: { id: number; action: "activate" | "end" | "revoke" }) => rentalsApi.mandateAction(id, action), ["mandates", "leases"]);
export const useUploadMandateDocument = () =>
  useRentalMutation(({ id, file, onProgress }: { id: number; file: File; onProgress: (p: number) => void }) => rentalsApi.uploadDocument(id, file, onProgress), ["mandates"]);
export const useRaiseMandateRequest = () =>
  useRentalMutation(
    ({ id, body, key }: { id: number; body: { category: string; title: string }; key: string }) => rentalsApi.raiseServiceRequest(id, body, key),
    ["service-requests"],
  );

// ---------- tenants (S32) ----------

export const useMandatePick = () => useQueryStates({ ...listParsers, mandate: parseAsInteger }, { history: "replace" });

export function useTenants(mandateId: number | null, s: Paged) {
  const params = paging(s, "name");
  return useQuery({
    queryKey: ["tenants", mandateId, params],
    queryFn: () => rentalsApi.tenants(mandateId!, params),
    enabled: mandateId !== null,
    placeholderData: keepPreviousData,
  });
}
export const useAllTenants = (mandateId: number | null) =>
  useQuery({ queryKey: ["tenants", mandateId, "all"], queryFn: () => rentalsApi.tenants(mandateId!, { pageSize: 100 }).then((p) => p.items), enabled: mandateId !== null });
export const useSaveTenant = (mandateId: number) =>
  useRentalMutation(({ id, body, key }: { id: number | null; body: Record<string, unknown>; key: string }) => rentalsApi.saveTenant(mandateId, id, body, key), ["tenants"]);

// ---------- leases (S33) ----------

export const useLeasesState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, mandate: parseAsString, open: parseAsInteger }, { history: "replace" });

export function useLeases(s: Paged & { status: string | null; mandate: string | null }) {
  const params = { ...paging(s), filter: { status: s.status, mandate_id: s.mandate } };
  return useQuery({ queryKey: ["leases", params], queryFn: () => rentalsApi.leases(params), placeholderData: keepPreviousData });
}
export const useLease = (id: number | null) => useQuery({ queryKey: ["leases", "one", id], queryFn: () => rentalsApi.lease(id!), enabled: id !== null });
export const useCreateLease = () =>
  useRentalMutation(({ mandateId, body, key }: { mandateId: number; body: Record<string, unknown>; key: string }) => rentalsApi.createLease(mandateId, body, key), ["leases"]);
export const useLeaseAction = () =>
  useRentalMutation(
    ({ id, action, body }: { id: number; action: "activate" | "end" | "terminate" | "renew"; body?: Record<string, unknown> }) => rentalsApi.leaseAction(id, action, body),
    ["leases", "rent-items"],
  );
export const useRecordInspection = () =>
  useRentalMutation(
    ({ id, body, key }: { id: number; body: Parameters<typeof rentalsApi.recordInspection>[1]; key: string }) => rentalsApi.recordInspection(id, body, key),
    ["leases"],
  );

// ---------- rent (S34) ----------

export const useRentState = () =>
  useQueryStates({ ...listParsers, overdue: parseAsBoolean.withDefault(true), status: parseAsString, lease: parseAsString }, { history: "replace" });

export function useRentItems(s: Paged & { overdue: boolean; status: string | null; lease: string | null }) {
  // "Overdue only" maps onto the status filter (the nightly job sets overdue).
  const params = { ...paging(s, "due_on"), filter: { status: s.overdue ? "overdue" : s.status, lease_id: s.lease } };
  return useQuery({ queryKey: ["rent-items", params], queryFn: () => rentalsApi.rentItems(params), placeholderData: keepPreviousData, refetchOnWindowFocus: true });
}
export const useRecordRent = () =>
  useRentalMutation(({ id, body }: { id: number; body: { paid_on: string; reference?: string } }) => rentalsApi.recordRent(id, body), ["rent-items", "leases"]);
export const useWaiveRent = () => useRentalMutation(({ id, reason }: { id: number; reason: string }) => rentalsApi.waiveRent(id, reason), ["rent-items", "leases"]);

// ---------- statements (S35) ----------

export const useStatements = (mandateId: number | null) =>
  useQuery({ queryKey: ["statements", mandateId], queryFn: () => rentalsApi.statements(mandateId!), enabled: mandateId !== null });
export const useGenerateStatement = (mandateId: number) =>
  useRentalMutation((body: { period_start: string; period_end: string }) => rentalsApi.generateStatement(mandateId, body), ["statements"]);
