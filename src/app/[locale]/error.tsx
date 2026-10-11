"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatePanel } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Unexpected render errors. Details stay out of the UI (and out of logs that could hold PII).
export default function RouteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations();
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <StatePanel
        icon={TriangleAlert}
        tone="danger"
        title={t("errors.page.title")}
        description={t("errors.page.body")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => retry()}>
              <RotateCcw data-icon="inline-start" />
              {t("common.retry")}
            </Button>
            <Button asChild>
              <Link href="/">{t("errors.home")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
