import type { IREntity, InfinityFilter, ResolvedPort, Position } from "./ir.js";
import type { ResourceInstance } from "./schema/spec.js";
import { DIRECTION_TO_NUM } from "./ir.js";
import { CompileError } from "./errors.js";
import { centerPosition } from "./footprints.js";

// v1 test-stub sizing: a value no real recipe rate will ever exhaust within a test run.
const INFINITY_FILTER_COUNT = 1_000_000_000;

// infinity-pipe's filter shape differs from infinity-chest's (percentage/temperature,
// not count) and isn't implemented yet — solids only for now.
const FLUID_RESOURCES = new Set(["crude-oil"]);

// Verified live against this server's prototypes.entity["electric-mining-drill"]
// (not assumed — game.entity_prototypes doesn't even exist in this API,
// it's prototypes.entity): tile_width/height 3, mining_drill_radius ≈2.49.
// Coverage per drill is a square of side tile_width + 2*radius ≈7.98;
// DRILL_COVERAGE uses floor (7) rather than round so adjacent drills
// slightly overlap their coverage instead of leaving an uncovered seam.
const DRILL_NAME = "electric-mining-drill";
const DRILL_FOOTPRINT = 3;
const DRILL_RADIUS = 2.49;
const DRILL_COVERAGE = DRILL_FOOTPRINT + 2 * Math.floor(DRILL_RADIUS);

export interface SynthesizedInstance {
  entities: IREntity[]; // relative to `anchor`
  ports: Record<string, ResolvedPort>; // offsets relative to `anchor`
  anchor: Position; // what layout.ts translates (0,0) to in absolute space
}

/**
 * Turn a resource-backed instance into concrete entities + ports, anchored
 * so layout.ts can translate them into absolute space uniformly with a
 * resolved function. `infinity_chest` anchors on `instance.position` (the
 * instance IS the chest). `real_drills` anchors on the bounding box's own
 * top-left corner instead — `instance.position` doesn't otherwise mean
 * anything for a scanned patch, since the patch's real-world location is
 * `bounding_box`, not something the spec author picks.
 */
export function synthesizeResourceInstance(instance: ResourceInstance): SynthesizedInstance {
  if (instance.resource_mode === "real_drills") {
    return placeDrills(instance);
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

  return { entities: [entity], ports: { out: port }, anchor: instance.position };
}

/**
 * v1 greedy placement: tile the bounding box in DRILL_COVERAGE-spaced rows
 * and columns, one drill per cell, regardless of whether that cell's
 * footprint is entirely ore (known limitation — the patch summary from
 * scan_resources deliberately withholds per-tile data to stay RCON-small,
 * so this is bbox-only, not patch-shape-aware; see docs/FORMAT.md).
 */
function placeDrills(instance: ResourceInstance): SynthesizedInstance {
  const bbox = instance.bounding_box;
  if (!bbox) {
    throw new CompileError(
      `${instance.id}: resource_mode "real_drills" requires bounding_box — run \`factoriollm scan-resources\` first and copy its output in.`,
    );
  }

  const anchor: Position = { x: bbox.left, y: bbox.top };
  const entities: IREntity[] = [];
  let count = 0;

  for (let y = bbox.top; y <= bbox.bottom; y += DRILL_COVERAGE) {
    for (let x = bbox.left; x <= bbox.right; x += DRILL_COVERAGE) {
      entities.push({
        localId: `${instance.id}.drill[${count}]`,
        name: DRILL_NAME,
        position: centerPosition({ x: x - anchor.x, y: y - anchor.y }, DRILL_NAME),
        direction: DIRECTION_TO_NUM.north,
      });
      count++;
    }
  }

  if (count === 0) {
    throw new CompileError(`${instance.id}: bounding_box too small to place any drills`);
  }

  const port: ResolvedPort = {
    side: "east",
    offset: { x: bbox.right - anchor.x + 1, y: 0 },
    direction: DIRECTION_TO_NUM.east,
    kind: "belt",
    item: instance.resource,
  };

  return { entities, ports: { out: port }, anchor };
}
