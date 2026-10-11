"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { adminApi, type RoleInput, type UserInput } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged, sort: string) => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? sort });

function useInvalidating<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>, keys: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

// ---------- S37 roles ----------

export const usePermissionCatalogue = () => useQuery({ queryKey: ["permissions"], queryFn: adminApi.permissions, staleTime: 30 * 60_000 });

export const useRolesState = () => useQueryStates(listParsers, { history: "replace" });

export function useRoles(s: Paged) {
  const params = paging(s, "id");
  return useQuery({ queryKey: ["roles", params], queryFn: () => adminApi.roles(params), placeholderData: keepPreviousData });
}

/** All roles (100 max) for pickers and labels. Needs admin.roles; callers fall back to the role id on 403. */
export const useAllRoles = (enabled = true) =>
  useQuery({ queryKey: ["roles", "all"], queryFn: () => adminApi.roles({ pageSize: 100, sort: "id" }).then((p) => p.items), staleTime: 5 * 60_000, enabled });

export const useSaveRole = () =>
  useInvalidating(({ id, body, key }: { id: number | null; body: RoleInput; key: string }) => (id === null ? adminApi.createRole(body, key) : adminApi.updateRole(id, body)), ["roles"]);

// ---------- S38 users ----------

export const useUsersState = () => useQueryStates({ ...listParsers, role: parseAsInteger, active: parseAsString }, { history: "replace" });

export function useUsers(s: Paged & { role: number | null; active: string | null }) {
  const params = { ...paging(s, "name"), filter: { role_id: s.role, active: s.active } };
  return useQuery({ queryKey: ["users", params], queryFn: () => adminApi.users(params), placeholderData: keepPreviousData });
}

export const useSaveUser = () =>
  useInvalidating(({ id, body, key }: { id: number | null; body: UserInput; key: string }) => (id === null ? adminApi.createUser(body, key) : adminApi.updateUser(id, body)), ["users"]);

// ---------- S39 audit log ----------

export const useAuditState = () =>
  useQueryStates(
    { ...listParsers, entityType: parseAsString, entityId: parseAsString, action: parseAsString, actor: parseAsString, open: parseAsInteger },
    { history: "replace" },
  );

export function useAuditLog(s: Paged & { entityType: string | null; entityId: string | null; action: string | null; actor: string | null }) {
  const params = {
    ...paging(s, "-id"),
    filter: { entity_type: s.entityType, entity_id: s.entityId, action: s.action, actor_id: s.actor },
  };
  return useQuery({ queryKey: ["audit-logs", params], queryFn: () => adminApi.audit(params), placeholderData: keepPreviousData });
}
