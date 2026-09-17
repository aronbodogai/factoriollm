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
};

export function footprintOf(entityName: string): { width: number; height: number } {
  return FOOTPRINTS[entityName] ?? { width: 1, height: 1 };
}

export function centerPosition(topLeft: Position, entityName: string): Position {
  const { width, height } = footprintOf(entityName);
  return { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
}
