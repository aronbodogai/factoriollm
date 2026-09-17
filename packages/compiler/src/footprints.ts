import type { Position } from "./ir.js";

/**
 * Tile footprint (width, height) for entities this project places. Used to
 * convert a spec's `position` — the footprint's top-left tile, an intuitive
 * authoring convention — into Factorio's own convention (the entity's
 * collision-box center: a 1x1 entity's center sits at (x+0.5, y+0.5), a 2x2
 * entity's at (x+1, y+1), etc).
 *
 * This isn't a convenience — it's required. Verified live: `create_entity`
 * silently snaps an off-center position to the nearest valid one instead of
 * erroring, which hides a wrong offset as a same-tile-but-different-center
 * duplicate on every re-apply rather than a visible failure.
 */
const FOOTPRINTS: Record<string, { width: number; height: number }> = {
  "infinity-chest": { width: 1, height: 1 },
  "infinity-pipe": { width: 1, height: 1 },
  "transport-belt": { width: 1, height: 1 },
  "pipe": { width: 1, height: 1 },
  "stone-furnace": { width: 2, height: 2 },
  "steel-furnace": { width: 2, height: 2 },
  "electric-furnace": { width: 3, height: 3 },
  "electric-mining-drill": { width: 3, height: 3 },
  "inserter": { width: 1, height: 1 },
  "burner-inserter": { width: 1, height: 1 },
  "assembling-machine-1": { width: 3, height: 3 },
  "assembling-machine-2": { width: 3, height: 3 },
  "assembling-machine-3": { width: 3, height: 3 },
  "solar-panel": { width: 3, height: 3 },
  "accumulator": { width: 2, height: 2 },
  "small-electric-pole": { width: 1, height: 1 },
  "medium-electric-pole": { width: 1, height: 1 },
  "offshore-pump": { width: 1, height: 1 },
  "boiler": { width: 3, height: 2 },
  "steam-engine": { width: 3, height: 5 },
};

export function footprintOf(entityName: string): { width: number; height: number } {
  return FOOTPRINTS[entityName] ?? { width: 1, height: 1 };
}

export function centerPosition(topLeft: Position, entityName: string): Position {
  const { width, height } = footprintOf(entityName);
  return { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
}
