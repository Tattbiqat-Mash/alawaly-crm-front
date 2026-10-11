import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, parseApiDate } from "./dates";

describe("API dates", () => {
  it("parses dates and zone-less timestamps as wall-clock time", () => {
    expect(parseApiDate("2026-10-10")?.toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(parseApiDate("2026-10-10 18:27:26")?.toISOString()).toBe("2026-10-10T18:27:26.000Z");
    expect(parseApiDate("not a date")).toBeNull();
    expect(parseApiDate(null)).toBeNull();
  });

  it("formats without shifting by the browser time zone", () => {
    expect(formatDate("2026-12-01", "en")).toBe("1 Dec 2026");
    expect(formatDateTime("2026-10-10 18:27:26", "en")).toContain("18:27");
    expect(formatDate(null, "en")).toBe("—");
  });

  it("uses the Gregorian calendar and Western digits in Arabic", () => {
    const text = formatDate("2026-12-01", "ar");
    expect(text).toContain("2026");
    expect(text).not.toMatch(/[٠-٩]/);
  });
});
