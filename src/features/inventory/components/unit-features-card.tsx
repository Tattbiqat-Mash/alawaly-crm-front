"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/hooks";
import { FeaturePicker } from "@/features/catalog/components/feature-picker";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useSetUnitFeatures, useUnitFeatures } from "../hooks";

/**
 * The unit's features (GET/PUT /units/{id}/features), with a quick add for a missing one. A list
 * that differs from the template's is recorded as an override.
 */
export function UnitFeaturesCard({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const query = useUnitFeatures(unitId);
  const save = useSetUnitFeatures(unitId);
  const [draft, setDraft] = useState<number[] | null>(null);
  const current = (query.data ?? []).map((f) => f.id);
  const value = draft ?? current;
  const changed = draft !== null && (draft.length !== current.length || draft.some((id) => !current.includes(id)));

  return (
    <section className="rounded-xl border bg-card p-3.5 sm:p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("units.features.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("units.features.hint")}</p>
        </div>
      </header>
      {query.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : query.error ? (
        <ErrorState compact error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FeaturePicker id="unit-features" type="unit" value={value} onChange={setDraft} known={query.data} disabled={!canEdit || save.isPending} />
      )}
      {changed && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={save.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(value, {
                onSuccess: () => {
                  setDraft(null);
                  toast.success(t("features.savedOn"));
                },
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      )}
    </section>
  );
}
