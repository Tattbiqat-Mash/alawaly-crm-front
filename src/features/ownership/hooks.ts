"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { ownershipApi } from "./api";

export const useOwnershipState = () =>
  useQueryStates({ ...listParsers, unit: parseAsString, client: parseAsString, source: parseAsString }, { history: "replace" });

export function useOwnerships(s: { page: number; pageSize: number; sort: string | null; unit: string | null; client: string | null; source: string | null }) {
  const params = {
    page: s.page,
    pageSize: clampPageSize(s.pageSize),
    sort: s.sort ?? "-id",
    filter: { unit_id: s.unit, client_id: s.client, source: s.source },
  };
  return useQuery({ queryKey: ["ownerships", params], queryFn: () => ownershipApi.list(params), placeholderData: keepPreviousData });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, body, key }: { unitId: number; body: { to_client_id: number; note: string }; key: string }) =>
      ownershipApi.transfer(unitId, body, key),
    onSuccess: () => {
      for (const key of ["ownerships", "unit", "warranties"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
