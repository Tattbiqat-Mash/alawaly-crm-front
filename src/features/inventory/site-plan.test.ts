import { describe, expect, it } from "vitest";
import { buildSitePlan, countByStatus, unitFloor } from "./site-plan";
import type { Building, UnitListItem } from "./types";

let nextId = 1;
const unit = (patch: Partial<UnitListItem>): UnitListItem => ({
  id: nextId++,
  crm_unit_id: null,
  project_id: 1,
  building_id: 10,
  unit_type_id: null,
  unit_number: null,
  unit_code: null,
  floor_num: null,
  status: "available",
  construction_status: null,
  availability: null,
  active: 1,
  rooms: null,
  bathrooms: null,
  total_area: null,
  price_in_tax: null,
  price_ex_tax: null,
  reservation_amount: null,
  version: 1,
  updated_at: "2026-01-01 00:00:00",
  ...patch,
});

const building = (id: number, code: string, floors: number | null): Building => ({
  id,
  crm_building_id: null,
  building_code: code,
  project_id: 1,
  stage_id: null,
  floors_count: floors,
  active: 1,
  updated_at: "2026-01-01 00:00:00",
});

describe("unitFloor", () => {
  it("prefers floor_num", () => {
    expect(unitFloor(unit({ floor_num: 0, unit_number: "305" }))).toBe(0);
  });

  it("reads floor + two-digit door numbers when floor_num is empty", () => {
    expect(unitFloor(unit({ unit_number: "101" }))).toBe(1);
    expect(unitFloor(unit({ unit_number: "1205" }))).toBe(12);
    expect(unitFloor(unit({ unit_number: "101A" }))).toBe(1);
  });

  it("leaves other numbers unknown", () => {
    expect(unitFloor(unit({ unit_number: "7" }))).toBeNull();
    expect(unitFloor(unit({ unit_number: "A-12" }))).toBeNull();
    expect(unitFloor(unit({ unit_number: null }))).toBeNull();
  });
});

describe("buildSitePlan", () => {
  it("stacks floors top-down, keeps gaps and sorts doors naturally", () => {
    const [b] = buildSitePlan(
      [unit({ unit_number: "310" }), unit({ unit_number: "102" }), unit({ unit_number: "302" }), unit({ unit_number: "101" })],
      [building(10, "B1", null)],
    );
    expect(b.floors.map((f) => f.floor)).toEqual([3, 2, 1]);
    expect(b.floors[0].units.map((u) => u.unit_number)).toEqual(["302", "310"]);
    expect(b.floors[1].units).toEqual([]);
    expect(b.maxPerFloor).toBe(2);
  });

  it("tops the stack up to floors_count and puts unknown floors last", () => {
    const [b] = buildSitePlan([unit({ floor_num: 1 }), unit({ unit_number: "X" })], [building(10, "B1", 3)]);
    expect(b.floors.map((f) => f.floor)).toEqual([3, 2, 1, null]);
  });

  it("draws empty buildings and groups unit rows without a building at the end", () => {
    const plan = buildSitePlan([unit({ building_id: null, unit_number: "V1" })], [building(11, "B10", 2), building(10, "B2", null)]);
    expect(plan.map((b) => b.id)).toEqual([10, 11, null]);
    expect(plan[1].floors.map((f) => f.floor)).toEqual([1, 0]);
  });
});

describe("countByStatus", () => {
  it("counts known statuses and buckets the rest", () => {
    const counts = countByStatus([unit({ status: "sold" }), unit({ status: "sold" }), unit({ status: "weird" })]);
    expect(counts.sold).toBe(2);
    expect(counts.unknown).toBe(1);
    expect(counts.available).toBe(0);
  });
});
