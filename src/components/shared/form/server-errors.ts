import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { fieldErrors, toApiError } from "@/lib/api/errors";

/**
 * Maps VALIDATION_FAILED.details (field → messages) onto form fields.
 * `fieldMap` translates API field names to form field names when they differ.
 * Returns true when at least one field received an error.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fieldMap: Partial<Record<string, Path<T>>> = {},
): boolean {
  const byField = fieldErrors(toApiError(error));
  if (!byField) return false;
  let mapped = false;
  for (const [apiField, messages] of Object.entries(byField)) {
    const name = fieldMap[apiField] ?? (apiField as Path<T>);
    if (!fields.includes(name)) continue;
    setError(name, { type: "server", message: messages[0] });
    mapped = true;
  }
  return mapped;
}

/** Field names a FIELD_NOT_WRITABLE error refers to (details.field or details.fields). */
export function notWritableFields(error: unknown): string[] {
  const e = toApiError(error);
  if (e.code !== "FIELD_NOT_WRITABLE" || !e.details) return [];
  const { field, fields } = e.details as { field?: unknown; fields?: unknown };
  if (typeof field === "string") return [field];
  if (Array.isArray(fields)) return fields.filter((f): f is string => typeof f === "string");
  return Object.keys(e.details);
}
