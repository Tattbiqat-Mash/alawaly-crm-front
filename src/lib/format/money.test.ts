import { describe, expect, it } from "vitest";
import { addMoney, compareMoney, formatDecimal, formatMoney, fromMinor, subtractMoney, toMinor } from "./money";

describe("toMinor", () => {
  it("normalises the precisions the API returns", () => {
    expect(toMinor("5000.0000")).toBe(BigInt(500000));
    expect(toMinor("5000")).toBe(BigInt(500000));
    expect(toMinor("575000.00")).toBe(BigInt(57500000));
    expect(toMinor(585000)).toBe(BigInt(58500000));
  });

  it("rounds half away from zero at 2 decimals", () => {
    expect(toMinor("0.005")).toBe(BigInt(1));
    expect(toMinor("0.004")).toBe(BigInt(0));
    expect(toMinor("-1.235")).toBe(BigInt(-124));
  });

  it("rejects non-numeric input", () => {
    expect(toMinor("")).toBeNull();
    expect(toMinor(null)).toBeNull();
    expect(toMinor("12,000")).toBeNull();
    expect(toMinor("abc")).toBeNull();
  });
});

describe("money math without floats", () => {
  it("adds and subtracts exactly", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(addMoney("172500.00", "402500.00")).toBe("575000.00");
    expect(subtractMoney("5000.00", "1000")).toBe("4000.00");
    expect(fromMinor(BigInt(-5))).toBe("-0.05");
  });

  it("compares amounts of different precision", () => {
    expect(compareMoney("5000.0000", "5000")).toBe(0);
    expect(compareMoney("4999.99", "5000")).toBe(-1);
    expect(compareMoney("5000.01", 5000)).toBe(1);
  });
});

describe("formatMoney", () => {
  it("uses Western digits in both languages", () => {
    expect(formatMoney("575000.00", "en")).toContain("575,000.00");
    expect(formatMoney("575000.00", "ar")).toMatch(/575[,٬]000[.٫]00/);
    expect(formatMoney("575000.00", "ar")).not.toMatch(/[٠-٩]/);
  });

  it("shows a dash for missing amounts", () => {
    expect(formatMoney(null, "en")).toBe("—");
  });
});

describe("formatDecimal", () => {
  it("trims trailing zeros of areas", () => {
    expect(formatDecimal("142.500", "en")).toBe("142.5");
    expect(formatDecimal(null, "en")).toBe("—");
  });
});
