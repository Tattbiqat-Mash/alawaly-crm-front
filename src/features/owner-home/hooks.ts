"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ownerHomeApi } from "./api";
import type { OwnerHandover, OwnerInstallment, OwnerSale } from "./types";

// No push channel yet: owner data refreshes when the app regains focus.
const live = { refetchOnWindowFocus: true } as const;

export const useOwnerUnits = () => useQuery({ queryKey: ["owner", "units"], queryFn: ownerHomeApi.units, ...live });
export const useOwnerSales = () => useQuery({ queryKey: ["owner", "sales"], queryFn: ownerHomeApi.sales, ...live });
export const useOpenRequests = () => useQuery({ queryKey: ["owner", "requests", "open"], queryFn: ownerHomeApi.openRequests, ...live });
export const useLatestNotifications = () =>
  useQuery({ queryKey: ["owner", "notifications", "latest"], queryFn: ownerHomeApi.latestNotifications, ...live });

const activeSales = (sales: OwnerSale[] | undefined) => (sales ?? []).filter((s) => s.status !== "cancelled");

/** The earliest unpaid installment across the owner's purchases. Only API values are shown. */
export function useNextInstallment(sales: OwnerSale[] | undefined) {
  const queries = useQueries({
    queries: activeSales(sales).map((sale) => ({
      queryKey: ["owner", "sales", sale.id, "installments"],
      queryFn: () => ownerHomeApi.installments(sale.id),
      ...live,
    })),
  });
  const pending: OwnerInstallment[] = queries
    .flatMap((q) => q.data ?? [])
    .filter((i) => i.status === "pending" && i.state !== "waived" && i.state !== "refunded");
  pending.sort((a, b) => a.date.localeCompare(b.date));
  return {
    installment: pending[0] ?? null,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  };
}

/** A handover waiting for the owner (scheduled or inspected, not yet accepted). */
export function useWaitingHandover(sales: OwnerSale[] | undefined) {
  const candidates = activeSales(sales).filter((s) => s.status === "contracted" || s.status === "paid_up");
  const queries = useQueries({
    queries: candidates.map((sale) => ({
      queryKey: ["owner", "sales", sale.id, "handover"],
      queryFn: () => ownerHomeApi.handover(sale.id),
      retry: false,
      ...live,
    })),
  });
  const waiting = queries
    .map((q) => q.data)
    .find((h): h is OwnerHandover => Boolean(h) && (h!.status === "scheduled" || h!.status === "inspected"));
  return { handover: waiting ?? null, isLoading: queries.some((q) => q.isLoading) };
}
