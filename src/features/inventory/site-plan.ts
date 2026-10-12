// Site plan: turns flat unit rows into buildings → floors → units for the visual (elevation) view.
// Pure functions only, so the layout rules stay testable.

import { UNIT_STATUSES, isUnitStatus, type UnitStatus } from "@/config/statuses";
import type { Building, UnitListItem } from "./types";

export type PlanFloor = {
  /** Floor number as the API counts it; null = units whose floor is unknown. */
  floor: number | null;
  units: UnitListItem[];
};

export type PlanBuilding = {
  /** null groups units that have no building (villas, plots, data gaps). */
  id: number | null;
  building: Building | undefined;
  /** Top floor first, the way a facade is read. The unknown-floor row comes last. */
  floors: PlanFloor[];
  units: UnitListItem[];
  /** Widest floor, sets the facade width. */
  maxPerFloor: number;
};

export type StatusCounts = Record<UnitStatus | "unknown", number>;

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Natural order: "2" < "10" < "101A". */
export const compareUnits = (a: UnitListItem, b: UnitListItem) =>
  collator.compare(a.unit_number ?? "", b.unit_number ?? "") || a.id - b.id;

const compareBuildings = (a: PlanBuilding, b: PlanBuilding) => {
  if (a.id === null || b.id === null) return a.id === null ? 1 : -1;
  return collator.compare(a.building?.building_code ?? "", b.building?.building_code ?? "") || a.id - b.id;
};

/**
 * The floor a unit sits on. Uses `floor_num`; when the API leaves it empty, reads the common
 * "floor + two-digit door" numbering (101 → 1, 1205 → 12, 304B → 3). Anything else is unknown.
 */
export function unitFloor(unit: UnitListItem): number | null {
  if (unit.floor_num !== null && Number.isFinite(unit.floor_num)) return unit.floor_num;
  const match = /^(\d{1,2})\d{2}[a-z]?$/i.exec(unit.unit_number?.trim() ?? "");
  return match ? Number(match[1]) : null;
}

/** Floors from the observed range (gaps kept so the facade stays true), topped up to `floors_count`. */
function stackFloors(units: UnitListItem[], floorsCount: number | null): PlanFloor[] {
  const byFloor = new Map<number | null, UnitListItem[]>();
  for (const unit of units) {
    const floor = unitFloor(unit);
    byFloor.set(floor, [...(byFloor.get(floor) ?? []), unit]);
  }

  const known = [...byFloor.keys()].filter((f): f is number => f !== null);
  const bottom = known.length ? Math.min(...known) : 0;
  let top = known.length ? Math.max(...known) : bottom - 1;
  // A building with fewer observed floors than it has keeps its real height.
  if (floorsCount && top - bottom + 1 < floorsCount) top = bottom + floorsCount - 1;

  const floors: PlanFloor[] = [];
  for (let floor = top; floor >= bottom; floor--) {
    floors.push({ floor, units: (byFloor.get(floor) ?? []).sort(compareUnits) });
  }
  const unknown = byFloor.get(null);
  if (unknown) floors.push({ floor: null, units: unknown.sort(compareUnits) });
  return floors;
}

/**
 * Groups units into buildings. Every building in `buildings` is drawn, even with no units in
 * scope (an empty shell is still part of the site); units of unlisted buildings get their own group.
 */
export function buildSitePlan(units: UnitListItem[], buildings: Building[]): PlanBuilding[] {
  const groups = new Map<number | null, UnitListItem[]>(buildings.map((b) => [b.id, []]));
  for (const unit of units) {
    groups.set(unit.building_id, [...(groups.get(unit.building_id) ?? []), unit]);
  }
  const lookup = new Map(buildings.map((b) => [b.id, b]));

  return [...groups.entries()]
    .filter(([id, list]) => id !== null || list.length > 0)
    .map(([id, list]) => {
      const building = id === null ? undefined : lookup.get(id);
      const floors = stackFloors(list, building?.floors_count ?? null);
      return {
        id,
        building,
        floors,
        units: list,
        maxPerFloor: Math.max(1, ...floors.map((f) => f.units.length)),
      };
    })
    .sort(compareBuildings);
}

export function countByStatus(units: UnitListItem[]): StatusCounts {
  const counts = Object.fromEntries([...UNIT_STATUSES, "unknown"].map((s) => [s, 0])) as StatusCounts;
  for (const unit of units) counts[isUnitStatus(unit.status) ? unit.status : "unknown"]++;
  return counts;
}
