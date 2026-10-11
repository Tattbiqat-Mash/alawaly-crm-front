"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { handoverApi, type SnagInput } from "./api";

export const useHandoversState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, sale: parseAsString }, { history: "replace" });

export function useHandovers(s: { page: number; pageSize: number; sort: string | null; status: string | null; sale: string | null }) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "-id", filter: { status: s.status, sale_id: s.sale } };
  return useQuery({ queryKey: ["handovers", params], queryFn: () => handoverApi.list(params), placeholderData: keepPreviousData });
}

// The owner accepts in the portal, so the staff view refreshes on focus.
export const useHandover = (id: number) =>
  useQuery({ queryKey: ["handover", id], queryFn: () => handoverApi.get(id), enabled: id > 0, refetchOnWindowFocus: true });

function useHandoverMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ["handover", "handovers", "sale"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useReschedule = (id: number) => useHandoverMutation((at: string) => handoverApi.reschedule(id, at));
export const useInspect = (id: number) => useHandoverMutation((body: { items: SnagInput[]; notes?: string }) => handoverApi.inspect(id, body));
export const useAddSnag = (id: number) => useHandoverMutation((body: SnagInput) => handoverApi.addSnag(id, body));
export const useUpdateSnag = () =>
  useHandoverMutation(({ snagId, status }: { snagId: number; status: "fixed" | "waived" }) => handoverApi.updateSnag(snagId, status));
export const useCloseHandover = (id: number) => useHandoverMutation(() => handoverApi.close(id));
