"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** A labelled checkbox bound to a boolean form field. */
export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  disabled?: boolean;
}) {
  const id = `cb-${name}`;
  return (
    <div className="flex items-center gap-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Checkbox id={id} checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} disabled={disabled} />
        )}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
