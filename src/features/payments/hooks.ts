"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { financeApi, type ConfirmOfflineInput, type ReconcileRow } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged) => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "-id" });

export const useTransactionsState = () =>
  useQueryStates(
    { ...listParsers, status: parseAsString, provider: parseAsString, type: parseAsString, sale: parseAsString },
    { history: "replace" },
  );

export function useTransactions(s: Paged & { status: string | null; provider: string | null; type: string | null; sale: string | null }) {
  const params = { ...paging(s), filter: { status: s.status, provider: s.provider, type: s.type, sale_id: s.sale } };
  return useQuery({
    queryKey: ["payment-transactions", params],
    queryFn: () => financeApi.transactions(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

/** One queue page (newest first). Used by confirmations and refunds. */
export function useTransactionQueue(filter: Record<string, string | readonly string[] | null>, page = 1) {
  const params = { page, pageSize: 100, sort: "-id", filter };
  return useQuery({
    queryKey: ["payment-transactions", params],
    queryFn: () => financeApi.transactions(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

function useFinanceMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      // Approvals change installments, reservations and sales as well.
      for (const key of ["payment-transactions", "sale", "reservations", "dashboard"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useConfirmOffline = () =>
  useFinanceMutation(({ body, key }: { body: ConfirmOfflineInput; key: string }) => financeApi.confirmOffline(body, key));
export const useApproveTransaction = () => useFinanceMutation((id: number) => financeApi.approve(id));
export const useRejectTransaction = () => useFinanceMutation(({ id, reason }: { id: number; reason: string }) => financeApi.reject(id, reason));
export const useRefund = () =>
  useFinanceMutation(({ id, body, key }: { id: number; body: { amount: string; reason: string }; key: string }) => financeApi.refund(id, body, key));
export const useReconcile = () => useMutation({ mutationFn: ({ provider, rows }: { provider: string; rows: ReconcileRow[] }) => financeApi.reconcile(provider, rows) });
