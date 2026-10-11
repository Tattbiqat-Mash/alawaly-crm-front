"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/config/permissions";
import { usePermissions } from "../hooks";

/** Renders children only when the staff user holds any of the given permissions. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission | readonly Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
