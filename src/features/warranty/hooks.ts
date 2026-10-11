"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { warrantyApi, type PolicyInput } from "./api";

export const useWarrantyState = () =>
  useQueryStates(
    { ...listParsers, tab: parseAsString.withDefault("policies"), unit: parseAsString, sale: parseAsString },
    { history: "replace" },
  );

type State = { page: number; pageSize: number; sort: string | null; unit: string | null; sale: string | null };

export function usePolicies(s: State, enabled: boolean) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: "-id" };
  return useQuery({ queryKey: ["warranty-policies", params], queryFn: () => warrantyApi.policies(params), placeholderData: keepPreviousData, enabled });
}

export function useWarranties(s: State, enabled: boolean) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: "-id", filter: { unit_id: s.unit, sale_id: s.sale } };
  return useQuery({ queryKey: ["warranties", params], queryFn: () => warrantyApi.warranties(params), placeholderData: keepPreviousData, enabled });
}

/** All policies (for names in the warranties tab). */
export const useAllPolicies = () =>
  useQuery({ queryKey: ["warranty-policies", "all"], queryFn: () => warrantyApi.policies({ pageSize: 100 }).then((p) => p.items), staleTime: 5 * 60_000 });

export function useSavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, key }: { id: number | null; body: PolicyInput; key: string }) =>
      id === null ? warrantyApi.createPolicy(body, key) : warrantyApi.updatePolicy(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warranty-policies"] }),
  });
}
