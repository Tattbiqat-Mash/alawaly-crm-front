import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { screenMetadata } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { SaleDetail } from "@/features/sales/components/sale-detail";

export const generateMetadata = screenMetadata("sales");

async function SaleRoute({ params }: { params: PageProps<"/[locale]/sales/[id]">["params"] }) {
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) notFound();
  return <SaleDetail id={saleId} />;
}

// S15 — Sale detail. The id is read inside Suspense so the shell stays instant.
export default function SalePage({ params }: PageProps<"/[locale]/sales/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SaleRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
