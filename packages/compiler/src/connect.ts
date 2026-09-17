import type { IREntity, Position, Direction, ResolvedPort } from "./ir.js";
import { DIRECTION_NAME } from "./ir.js";
import type { Connection } from "./schema/spec.js";
import { CompileError } from "./errors.js";
import { centerPosition } from "./footprints.js";

const OPPOSITE: Record<Direction, Direction> = { 0: 8, 4: 12, 8: 0, 12: 4 };
const STEP: Record<Direction, Position> = {
  0: { x: 0, y: -1 },
  4: { x: 1, y: 0 },
  8: { x: 0, y: 1 },
  12: { x: -1, y: 0 },
};
const BELT_ENTITY_NAME: Record<"belt" | "pipe", string> = {
  belt: "transport-belt",
  pipe: "pipe",
};

function resolvePort(ref: string, ports: Map<string, ResolvedPort>): ResolvedPort {
  const port = ports.get(ref);
  if (!port) {
    throw new CompileError(`unknown port reference: "${ref}" (expected "instanceId.portName")`);
  }
  return port;
}

/** Tiles strictly between `from` and `to`, stepping by 1 tile in `direction` — the gap a connector needs to fill. */
function gapTiles(from: Position, to: Position, direction: Direction): Position[] {
  const step = STEP[direction];
  const distance = Math.round(Math.hypot(to.x - from.x, to.y - from.y));
  const tiles: Position[] = [];
  for (let i = 1; i < distance; i++) {
    tiles.push({ x: from.x + step.x * i, y: from.y + step.y * i });
  }
  return tiles;
}

function isHorizontal(direction: Direction): boolean {
  return direction === 4 || direction === 12;
}

/** The one compatible corner for an L-bend, or null if the two directions/positions don't admit one. */
function findCorner(from: ResolvedPort, to: ResolvedPort): Position | null {
  const fromHorizontal = isHorizontal(from.direction);
  const toHorizontal = isHorizontal(to.direction);
  if (fromHorizontal === toHorizontal) return null; // need perpendicular directions

  const corner = fromHorizontal
    ? { x: to.offset.x, y: from.offset.y }
    : { x: from.offset.x, y: to.offset.y };

  if (corner.x === from.offset.x && corner.y === from.offset.y) return null; // degenerate: 0-length leg
  if (corner.x === to.offset.x && corner.y === to.offset.y) return null;

  const leg1Step = STEP[from.direction];
  const leg1Sign = fromHorizontal ? Math.sign(corner.x - from.offset.x) : Math.sign(corner.y - from.offset.y);
  const expectedLeg1Sign = fromHorizontal ? Math.sign(leg1Step.x) : Math.sign(leg1Step.y);
  if (leg1Sign !== expectedLeg1Sign) return null;

  const leg2Step = STEP[to.direction];
  const leg2Sign = fromHorizontal ? Math.sign(to.offset.y - corner.y) : Math.sign(to.offset.x - corner.x);
  const expectedLeg2Sign = fromHorizontal ? Math.sign(leg2Step.y) : Math.sign(leg2Step.x);
  if (leg2Sign !== expectedLeg2Sign) return null;

  return corner;
}

function unroutable(conn: Connection, from: ResolvedPort, to: ResolvedPort): CompileError {
  return new CompileError(
    `UNROUTABLE_CONNECTION: port ${conn.from} at (${from.offset.x},${from.offset.y}) facing ${DIRECTION_NAME[from.direction]} ` +
      `cannot reach ${conn.to} at (${to.offset.x},${to.offset.y}) facing ${DIRECTION_NAME[to.direction]} with a straight-or-single-bend ${conn.kind} run — ` +
      `reposition one of the instances or add an intermediate connection.`,
  );
}

function routeBeltOrPipe(conn: Connection, from: ResolvedPort, to: ResolvedPort): IREntity[] {
  const entityName = BELT_ENTITY_NAME[conn.kind as "belt" | "pipe"];

  if (from.direction === to.direction) {
    const step = STEP[from.direction];
    const dx = to.offset.x - from.offset.x;
    const dy = to.offset.y - from.offset.y;
    const axisAligned =
      (step.x !== 0 && dy === 0 && Math.sign(dx) === Math.sign(step.x)) ||
      (step.y !== 0 && dx === 0 && Math.sign(dy) === Math.sign(step.y));
    if (axisAligned) {
      return gapTiles(from.offset, to.offset, from.direction).map((position, index) => ({
        localId: `conn:${conn.from}->${conn.to}:${index}`,
        name: entityName,
        position: centerPosition(position, entityName),
        direction: from.direction,
      }));
    }
  }

  const corner = findCorner(from, to);
  if (corner) {
    const leg1 = gapTiles(from.offset, corner, from.direction).map((position, index) => ({
      localId: `conn:${conn.from}->${conn.to}:leg1:${index}`,
      name: entityName,
      position: centerPosition(position, entityName),
      direction: from.direction,
    }));
    const cornerEntity: IREntity = {
      localId: `conn:${conn.from}->${conn.to}:corner`,
      name: entityName,
      position: centerPosition(corner, entityName),
      direction: to.direction,
    };
    const leg2 = gapTiles(corner, to.offset, to.direction).map((position, index) => ({
      localId: `conn:${conn.from}->${conn.to}:leg2:${index}`,
      name: entityName,
      position: centerPosition(position, entityName),
      direction: to.direction,
    }));
    return [...leg1, cornerEntity, ...leg2];
  }

  throw unroutable(conn, from, to);
}

export interface RouteResult {
  entities: IREntity[];
  errors: string[];
}

/** Routes every connection independently, collecting ALL errors (not fail-fast) so a spec's whole set of problems shows at once. */
export function routeConnections(connections: Connection[], ports: Map<string, ResolvedPort>): RouteResult {
  const entities: IREntity[] = [];
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      const from = resolvePort(conn.from, ports);
      const to = resolvePort(conn.to, ports);

      if (from.kind !== conn.kind || to.kind !== conn.kind) {
        throw new CompileError(
          `connection ${conn.from} -> ${conn.to}: kind mismatch (declared "${conn.kind}", ports are "${from.kind}"/"${to.kind}")`,
        );
      }
      if (conn.kind === "wire") {
        throw new CompileError(`connection ${conn.from} -> ${conn.to}: kind "wire" isn't implemented yet — belt/pipe only for now.`);
      }

      entities.push(...routeBeltOrPipe(conn, from, to));
    } catch (err) {
      errors.push(err instanceof CompileError ? err.message : String(err));
    }
  }

  return { entities, errors };
}
