import { describe, expect, it } from "vitest";
import { normalizeSaudiMobile } from "./phone";

describe("normalizeSaudiMobile", () => {
  it.each([
    ["0500000101", "+966500000101"],
    ["500000101", "+966500000101"],
    ["+966500000101", "+966500000101"],
    ["966500000101", "+966500000101"],
    ["00966500000101", "+966500000101"],
    ["050 000 0101", "+966500000101"],
    ["٠٥٠٠٠٠٠١٠١", "+966500000101"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeSaudiMobile(input)).toBe(expected);
  });

  it.each(["", "0400000101", "05000001", "+1 555 0100", "abc"])("rejects %s", (input) => {
    expect(normalizeSaudiMobile(input)).toBeNull();
  });
});
