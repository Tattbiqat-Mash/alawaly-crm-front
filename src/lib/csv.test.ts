import { describe, expect, it } from "vitest";
import { csvToRecords, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, separators and newlines inside quotes", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n"line\nbreak",2')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["line\nbreak", "2"],
    ]);
  });

  it("accepts CRLF, a BOM, semicolons and drops empty lines", () => {
    expect(parseCsv("﻿a;b\r\n1;2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("csvToRecords", () => {
  it("keys rows by header and omits blank cells", () => {
    const { columns, records } = csvToRecords("crm_unit_id,unit_number,rooms\n7006,101A,4\n7007,,3");
    expect(columns).toEqual(["crm_unit_id", "unit_number", "rooms"]);
    expect(records).toEqual([
      { crm_unit_id: "7006", unit_number: "101A", rooms: "4" },
      { crm_unit_id: "7007", rooms: "3" },
    ]);
  });
});
