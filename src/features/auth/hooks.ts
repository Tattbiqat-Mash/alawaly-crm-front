"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { hasPermission, type Permission } from "@/config/permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { authApi } from "./api";
import type { Me } from "./types";

export const meQueryKey = ["me"] as const;

/**
 * The signed-in staff profile. Refreshed on window focus so role changes show up.
 * Undefined until hydration ends: the server never has it, and a Suspense boundary that
 * hydrates after the query resolved would otherwise render something else than its HTML.
 */
export function useMe() {
  const { data } = useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  return useHydrated() ? data : undefined;
}

/** `can()` hides or disables controls; the API still enforces every permission (403 is handled). */
export function usePermissions() {
  const data = useMe();
  const permissions = data?.permissions;
  const can = useCallback(
    (required: Permission | readonly Permission[]) => hasPermission(permissions, required),
    [permissions],
  );
  return { can, ready: Boolean(data), me: data };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, permissions }) => {
      // Seed the profile so the shell renders without another round trip.
      queryClient.setQueryData<Me>(meQueryKey, { ...user, permissions });
    },
  });
}

/** Signs out; local state is dropped even if the network call fails. */
export function useLogout(onDone: () => void) {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: onDone,
  });
}
