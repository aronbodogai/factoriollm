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

  // A chest — even an infinity-chest — never ejects onto an adjacent belt by
  // itself; verified live that an inserter is required to move items from
  // any chest onto a belt. So the "out" port isn't the chest's own tile —
  // it's a belt tile at local (2,0), fed by an inserter that picks up from
  // the chest (west) and drops onto that belt (east).
  const chest: IREntity = {
    localId: `${instance.id}.chest`,
    name: "infinity-chest",
    position: centerPosition({ x: 0, y: 0 }, "infinity-chest"),
    infinityFilter: filter,
  };
  // A plain inserter (~0.83-1.2 items/sec) comfortably covers one
  // furnace's demand (0.625/sec for an electric-furnace) — this is meant for
  // a 1:1 chest-to-consumer feed. A single inserter feeding a SHARED belt
  // with multiple downstream consumers is a different problem entirely:
  // verified live that whichever consumer sits first on the belt drains
  // 100% of supply forever (it grabs every item before belt motion can
  // carry any past it, up to the destination's own buffer cap), regardless
  // of how much oversupply exists upstream or how large the feeder
  // inserter's stack bonus is. That's a real Factorio production-line
  // balancing problem, not something to solve here — spec authors needing
  // several consumers should instantiate this resource multiple times (see
  // docs/FORMAT.md) rather than fan one instance's output into many.
  const outputInserter: IREntity = {
    localId: `${instance.id}.inserter`,
    name: "inserter",
    position: centerPosition({ x: 1, y: 0 }, "inserter"),
    direction: DIRECTION_TO_NUM.west,
  };
  const outputBelt: IREntity = {
    localId: `${instance.id}.belt`,
    name: "transport-belt",
    position: centerPosition({ x: 2, y: 0 }, "transport-belt"),
    direction: DIRECTION_TO_NUM.east,
  };
  // The inserter needs its own power regardless of where this instance ends
  // up relative to whatever grid is nearby — verified live that a resource
  // instance placed between two well-connected poles can still land just
  // outside both of their 3.5-tile supply radii. This pole only needs to be
  // within wire_reach (9) of *something* on the grid, which is a much looser
  // requirement to satisfy by placement alone.
  const pole: IREntity = {
    localId: `${instance.id}.pole`,
    name: "medium-electric-pole",
    position: centerPosition({ x: 0, y: -1 }, "medium-electric-pole"),
  };

  const port: ResolvedPort = {
    side: "east",
    offset: { x: 2, y: 0 },
    direction: DIRECTION_TO_NUM.east,
    kind: "belt",
    item: instance.resource,
  };

  return { entities: [chest, outputInserter, outputBelt, pole], ports: { out: port }, anchor: instance.position };
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
