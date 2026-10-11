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

describe("server time", () => {
  it("treats zone-less server timestamps as Saudi time for countdowns", async () => {
    const { serverTimeToEpoch, formatRelative, inputToApiTimestamp } = await import("./dates");
    expect(new Date(serverTimeToEpoch("2026-10-12 18:00:00")!).toISOString()).toBe("2026-10-12T15:00:00.000Z");
    const now = Date.parse("2026-10-12T12:00:00Z"); // 15:00 Riyadh
    expect(formatRelative("2026-10-12 18:00:00", "en", now)).toBe("in 3 hours");
    expect(formatRelative("2026-10-12 14:00:00", "en", now)).toBe("1 hour ago");
    expect(inputToApiTimestamp("2027-12-20T10:00")).toBe("2027-12-20 10:00:00");
  });
});
