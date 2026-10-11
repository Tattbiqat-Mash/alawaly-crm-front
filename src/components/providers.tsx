"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Direction } from "radix-ui";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ApiError } from "@/lib/api/errors";
import { makeQueryClient } from "@/lib/api/query-client";

type Props = { children: ReactNode; dir: "rtl" | "ltr" };

export function Providers({ children, dir }: Props) {
  const t = useTranslations("errors.codes");

  // Only app-wide conditions toast globally; everything else is shown where it happened.
  const [queryClient] = useState(() =>
    makeQueryClient((error: ApiError) => {
      if (error.code === "RATE_LIMITED") toast.warning(t("RATE_LIMITED"), { id: "rate-limited" });
      else if (error.isNetwork) toast.error(t("NETWORK_ERROR"), { id: "network" });
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Direction.Provider dir={dir}>
            <TooltipProvider delayDuration={300}>
              {children}
              <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} />
            </TooltipProvider>
          </Direction.Provider>
        </ThemeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
