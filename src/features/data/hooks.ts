"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { dataApi, type ExportKind } from "./api";

export const useDocumentsState = () => useQueryStates({ ...listParsers, source: parseAsString, type: parseAsString }, { history: "replace" });

export function useDocuments(s: { page: number; pageSize: number; source: string | null; type: string | null }, enabled: boolean) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), filter: { source: s.source, type: s.type } };
  return useQuery({ queryKey: ["documents", params], queryFn: () => dataApi.documents(params), placeholderData: keepPreviousData, enabled });
}

export const useExport = () => useMutation({ mutationFn: (what: ExportKind) => dataApi.download(what) });
