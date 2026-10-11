"use client";

import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * "No dead buttons": an action whose screen or API is not available yet renders disabled,
 * with the reason available on hover, focus and to screen readers.
 */
export function UnavailableAction({
  label,
  reason,
  icon: Icon,
  variant = "outline",
}: {
  label: string;
  reason: string;
  icon?: LucideIcon;
  variant?: "outline" | "default" | "secondary" | "ghost";
}) {
  const id = useId();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The wrapper stays focusable so keyboard users can reach the explanation. */}
        <span tabIndex={0} className="inline-flex rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Button variant={variant} disabled aria-describedby={id} tabIndex={-1}>
            {Icon && <Icon data-icon="inline-start" />}
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent id={id}>{reason}</TooltipContent>
    </Tooltip>
  );
}
