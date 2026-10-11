"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import type { Permission } from "@/config/permissions";
import { usePermissions } from "@/features/auth/hooks";
import type { InitiateInput } from "@/features/payments/types";
import { paymentsApi, reservationsApi, salesApi } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged) => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "-id" });

// ---------- Reservations (S11, S12) ----------

export const useReservationsState = () =>
  useQueryStates({ ...listParsers, state: parseAsString, client: parseAsString, unit: parseAsString }, { history: "replace" });

export function useReservations(s: Paged & { state: string | null; client: string | null; unit: string | null }) {
  const params = { ...paging(s), filter: { state: s.state, client_id: s.client, unit_id: s.unit } };
  return useQuery({
    queryKey: ["reservations", params],
    queryFn: () => reservationsApi.list(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

/** Pending and active reservations: the ones a sale can start from. */
export const useOpenReservations = () =>
  useQuery({
    queryKey: ["reservations", "open"],
    queryFn: () => reservationsApi.list({ pageSize: 100, sort: "-id", filter: { state: ["pending", "active"] } }),
  });

function useInvalidate(...keys: string[][]) {
  const queryClient = useQueryClient();
  return () => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
}

export function useCreateReservation() {
  const invalidate = useInvalidate(["reservations"], ["units"], ["unit"]);
  return useMutation({
    mutationFn: ({ body, key }: { body: { unit_id: number; client_id: number; notes?: string }; key: string }) =>
      reservationsApi.create(body, key),
    onSuccess: invalidate,
  });
}

export function useExtendReservation() {
  const invalidate = useInvalidate(["reservations"]);
  return useMutation({ mutationFn: ({ id, hours }: { id: number; hours: number }) => reservationsApi.extend(id, hours), onSuccess: invalidate });
}

export function useCancelReservation() {
  const invalidate = useInvalidate(["reservations"], ["units"], ["unit"]);
  return useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => reservationsApi.cancel(id, reason), onSuccess: invalidate });
}

export function useInitiatePayment() {
  const invalidate = useInvalidate(["payment-transactions"], ["sale"], ["reservations"]);
  return useMutation({ mutationFn: ({ body, key }: { body: InitiateInput; key: string }) => paymentsApi.initiate(body, key), onSuccess: invalidate });
}

// ---------- Sales (S13–S15) ----------

export const useSalesState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, client: parseAsString, unit: parseAsString }, { history: "replace" });

export function useSales(s: Paged & { status: string | null; client: string | null; unit: string | null }) {
  const params = { ...paging(s), filter: { status: s.status, client_id: s.client, unit_id: s.unit } };
  return useQuery({ queryKey: ["sales", params], queryFn: () => salesApi.list(params), placeholderData: keepPreviousData });
}

export function useCreateSale() {
  const invalidate = useInvalidate(["sales"], ["reservations"], ["units"], ["unit"]);
  return useMutation({
    mutationFn: ({ body, key }: { body: { unit_id: number; client_id: number; reservation_id?: number; price_agreed: string }; key: string }) =>
      salesApi.create(body, key),
    onSuccess: invalidate,
  });
}

export const useSale = (id: number) => useQuery({ queryKey: ["sale", id], queryFn: () => salesApi.get(id), enabled: id > 0 });

function useSaleMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>, extra: string[][] = []) {
  const invalidate = useInvalidate(["sale"], ["sales"], ...extra);
  return useMutation({ mutationFn: fn, onSuccess: invalidate });
}

export const useTransitionSale = (id: number) => useSaleMutation((to: string) => salesApi.transition(id, to), [["units"]]);
export const useCancelSale = (id: number) => useSaleMutation((reason: string) => salesApi.cancel(id, reason), [["units"], ["unit"]]);

function useGated<T>(permission: Permission | readonly Permission[], key: readonly unknown[], fn: () => Promise<T>) {
  const { can, ready } = usePermissions();
  const allowed = ready && can(permission);
  return { ...useQuery({ queryKey: key, queryFn: fn, enabled: allowed }), allowed };
}

export const useInstallments = (id: number) => useGated("sales.view", ["sale", id, "installments"], () => salesApi.installments(id));
export const useGenerateInstallments = (id: number) => useSaleMutation(() => salesApi.generateInstallments(id));
export const useChangeInstallmentDate = () =>
  useSaleMutation(({ id, date }: { id: number; date: string }) => salesApi.changeInstallmentDate(id, date));

export const useSaleDocuments = (id: number) => useGated("sales.docs", ["sale", id, "documents"], () => salesApi.documents(id));
export const useUploadDocument = (id: number) =>
  useSaleMutation(({ type, file, onProgress }: { type: string; file: File; onProgress: (p: number) => void }) =>
    salesApi.uploadDocument(id, type, file, onProgress),
  );

export const useScheduleHandover = (id: number) =>
  useSaleMutation((body: { scheduled_at: string; notes?: string }) => salesApi.scheduleHandover(id, body), [["handovers"]]);

export const useSaleHandovers = (id: number) => useGated("sales.view", ["handovers", { sale: id }], () => salesApi.handoversForSale(id));
export const useSaleWarranties = (id: number) => useGated("warranty.manage", ["warranties", { sale: id }], () => salesApi.warrantiesForSale(id));

export const useWarrantyPolicies = () => useGated("warranty.manage", ["warranty-policies", "all"], salesApi.warrantyPolicies);
export const useApplyWarranties = (id: number) =>
  useSaleMutation((policyIds: number[]) => salesApi.applyWarranties(id, policyIds), [["warranties"]]);

export const useSaleTransactions = (id: number) =>
  useGated("finance.view", ["payment-transactions", { sale: id }], () => salesApi.transactions(id));
