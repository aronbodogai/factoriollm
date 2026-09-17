import type { IREntity, InfinityFilter } from "./ir.js";
import type { ResourceInstance } from "./schema/spec.js";
import { CompileError } from "./errors.js";
import { centerPosition } from "./footprints.js";

// v1 test-stub sizing: a value no real recipe rate will ever exhaust within a test run.
const INFINITY_FILTER_COUNT = 1_000_000_000;

// infinity-pipe's filter shape differs from infinity-chest's (percentage/temperature,
// not count) and isn't implemented yet — solids only for now.
const FLUID_RESOURCES = new Set(["crude-oil"]);

/**
 * Turn a resource-backed instance into concrete entities. `real_drills`
 * (greedy mining-drill packing over a scanned patch) is Phase 3 — for now
 * every resource instance must use `infinity_chest`, a stand-in that proves
 * the rest of the pipeline (format, diff, apply) without needing ore-patch
 * scanning yet.
 */
export function synthesizeResourceInstance(instance: ResourceInstance): IREntity[] {
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

  return [
    {
      localId: instance.id,
      name: "infinity-chest",
      position: centerPosition(instance.position, "infinity-chest"),
      infinityFilter: filter,
    },
  ];
}
