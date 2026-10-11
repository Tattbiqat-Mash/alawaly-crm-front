import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="grid gap-3">
        <h1 className="text-lg font-semibold">{t("notFound.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("notFound.body")}</p>
        <Button asChild className="justify-self-center">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
