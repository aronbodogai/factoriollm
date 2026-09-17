import type { IREntity, InfinityFilter, ResolvedPort } from "./ir.js";
import type { ResourceInstance } from "./schema/spec.js";
import { DIRECTION_TO_NUM } from "./ir.js";
import { CompileError } from "./errors.js";
import { centerPosition } from "./footprints.js";

// v1 test-stub sizing: a value no real recipe rate will ever exhaust within a test run.
const INFINITY_FILTER_COUNT = 1_000_000_000;

// infinity-pipe's filter shape differs from infinity-chest's (percentage/temperature,
// not count) and isn't implemented yet — solids only for now.
const FLUID_RESOURCES = new Set(["crude-oil"]);

export interface SynthesizedInstance {
  entities: IREntity[]; // instance-local positions (translated by layout.ts, same as a function's)
  ports: Record<string, ResolvedPort>;
}

/**
 * Turn a resource-backed instance into concrete entities + ports, in the
 * same instance-local coordinate frame a resolved function uses, so layout.ts
 * can translate either kind uniformly. `real_drills` (greedy mining-drill
 * packing over a scanned patch) is Phase 3 — for now every resource instance
 * must use `infinity_chest`, a stand-in that proves the rest of the pipeline
 * (format, diff, apply, wiring) without needing ore-patch scanning yet.
 */
export function synthesizeResourceInstance(instance: ResourceInstance): SynthesizedInstance {
  if (instance.resource_mode === "real_drills") {
    throw new CompileError(
      `${instance.id}: resource_mode "real_drills" isn't implemented yet (Phase 3) — use "infinity_chest" for now.`,
    );
  }
  if (FLUID_RESOURCES.has(instance.resource)) {
    throw new CompileError(
      `${instance.id}: fluid resource "${instance.resource}" needs an infinity-pipe stub, not implemented yet — solids only for now.`,
    );
  }

  const filter: InfinityFilter = {
    name: instance.resource,
    count: INFINITY_FILTER_COUNT,
    mode: "at-least",
  };

  const entity: IREntity = {
    localId: instance.id,
    name: "infinity-chest",
    position: centerPosition({ x: 0, y: 0 }, "infinity-chest"),
    infinityFilter: filter,
  };

  // Single "out" port immediately east of the chest's own tile — an
  // intentionally simple default; resource instances don't have a
  // user-authored port layout the way functions do.
  const port: ResolvedPort = {
    side: "east",
    offset: { x: 1, y: 0 },
    direction: DIRECTION_TO_NUM.east,
    kind: "belt",
    item: instance.resource,
  };

  return { entities: [entity], ports: { out: port } };
}
