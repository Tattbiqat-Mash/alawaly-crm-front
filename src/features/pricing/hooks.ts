"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { pricingApi } from "./api";

export function usePriceApprovalsState() {
  return useQueryStates(
    { ...listParsers, status: parseAsString.withDefault("pending"), unit: parseAsString },
    { history: "replace" },
  );
}
export type PriceApprovalsState = ReturnType<typeof usePriceApprovalsState>[0];

export function usePriceApprovals(state: PriceApprovalsState) {
  const params = {
    page: state.page,
    pageSize: clampPageSize(state.pageSize),
    sort: "-id",
    // "all" is the select's sentinel for no filter.
    filter: { status: state.status === "all" ? null : state.status, unit_id: state.unit },
  };
  return useQuery({
    queryKey: ["price-changes", params],
    queryFn: () => pricingApi.list(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true, // a queue other people work on
  });
}

export function useDecidePriceChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "reject" }) =>
      decision === "approve" ? pricingApi.approve(id) : pricingApi.reject(id),
    onSettled: (change) => {
      queryClient.invalidateQueries({ queryKey: ["price-changes"] });
      if (change) {
        queryClient.invalidateQueries({ queryKey: ["unit", change.unit_id] });
        queryClient.invalidateQueries({ queryKey: ["units"] });
      }
    },
  });
}
