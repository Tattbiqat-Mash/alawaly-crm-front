"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Building, CloneResult } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { useCloneBuilding } from "../hooks";

const MAX_COPIES = 50;

/**
 * Duplicate a building with all its units (template link, overrides and unique details); copies
 * start available with no owner or deed. Not idempotent, so the button stays disabled while it runs.
 */
export function CloneBuildingDialog({ building, open, onOpenChange }: { building: Building; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("buildings.clone");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const clone = useCloneBuilding(building.id);
  const [copies, setCopies] = useState("1");
  const [buildingPattern, setBuildingPattern] = useState("");
  const [unitPattern, setUnitPattern] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloneResult[] | null>(null);

  const count = Number(copies);
  const copiesError = submitted && !(/^\d+$/.test(copies) && count >= 1 && count <= MAX_COPIES) ? t("copiesInvalid", { max: MAX_COPIES }) : undefined;

  const close = (next: boolean) => {
    if (!next && clone.isPending) return;
    if (!next) {
      setCopies("1");
      setBuildingPattern("");
      setUnitPattern("");
      setSubmitted(false);
      setError(null);
      setResult(null);
      clone.reset();
    }
    onOpenChange(next);
  };

  const submit = () => {
    setSubmitted(true);
    setError(null);
    if (!(/^\d+$/.test(copies) && count >= 1 && count <= MAX_COPIES)) return;
    clone.mutate(
      {
        copies: count,
        ...(buildingPattern.trim() && { building_code_pattern: buildingPattern.trim() }),
        ...(unitPattern.trim() && { unit_code_pattern: unitPattern.trim() }),
      },
      {
        onSuccess: (created) => {
          setResult(created);
          toast.success(t("done", { count: created.length }));
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { code: building.building_code ?? `#${building.id}` })}</DialogDescription>
        </DialogHeader>
        {result ? (
          <ul className="grid gap-1.5">
            {result.map((r) => (
              <li key={r.building_id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                <Link href={`/buildings/${r.building_id}`} className="font-medium text-primary hover:underline" dir="ltr">
                  {r.building_code}
                </Link>
                <span className="num text-xs text-muted-foreground">{t("unitsCreated", { count: r.units_created })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <form
            id="clone-building"
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <fieldset disabled={clone.isPending} className="grid gap-4">
              <Field id="cl-copies" label={t("copies")} required error={copiesError}>
                <Input {...fieldA11y("cl-copies", copiesError)} value={copies} onChange={(e) => setCopies(e.target.value)} inputMode="numeric" dir="ltr" className="w-28" />
              </Field>
              <Field id="cl-bpattern" label={t("buildingPattern")} description={t("buildingPatternHint")}>
                <Input
                  {...fieldA11y("cl-bpattern", undefined, true)}
                  value={buildingPattern}
                  onChange={(e) => setBuildingPattern(e.target.value)}
                  dir="ltr"
                  className="font-mono"
                  placeholder="{source}-C{n}"
                />
              </Field>
              <Field id="cl-upattern" label={t("unitPattern")} description={t("unitPatternHint")}>
                <Input
                  {...fieldA11y("cl-upattern", undefined, true)}
                  value={unitPattern}
                  onChange={(e) => setUnitPattern(e.target.value)}
                  dir="ltr"
                  className="font-mono"
                  placeholder="{building}-F{floor}-U{unit}"
                />
              </Field>
            </fieldset>
            <FormError>{error}</FormError>
          </form>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={clone.isPending}>
            {result ? tc("close") : tc("cancel")}
          </Button>
          {!result && (
            <Button type="submit" form="clone-building" disabled={clone.isPending}>
              {clone.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
