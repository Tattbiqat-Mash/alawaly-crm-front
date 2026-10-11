"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { templatesApi, type TemplateInput } from "./api";

export const useTemplatesState = () => useQueryStates(listParsers, { history: "replace" });

export function useTemplates(s: { page: number; pageSize: number; sort: string | null }) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "key" };
  return useQuery({ queryKey: ["notification-templates", params], queryFn: () => templatesApi.list(params), placeholderData: keepPreviousData });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, key }: { id: number | null; body: TemplateInput; key: string }) =>
      id === null ? templatesApi.create(body, key) : templatesApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-templates"] }),
  });
}
