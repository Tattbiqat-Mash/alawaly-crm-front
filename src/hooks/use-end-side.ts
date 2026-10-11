"use client";

import { Direction } from "radix-ui";

/** Sheets open from the logical end edge: right in English, left in Arabic. */
export function useEndSide(): "left" | "right" {
  return Direction.useDirection() === "rtl" ? "left" : "right";
}

export function useStartSide(): "left" | "right" {
  return Direction.useDirection() === "rtl" ? "right" : "left";
}
