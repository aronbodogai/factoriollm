// Factorio 2.0 building direction: 0/4/8/12 = N/E/S/W (doubled from the 1.x
// 0/2/4/6 convention — see docs/FORMAT.md). Diagonal-only rail directions
// aren't in scope for this format yet.
export type Direction = 0 | 4 | 8 | 12;

export interface Position {
  x: number;
  y: number;
}

export interface InfinityFilter {
  name: string;
  count: number;
  mode: "at-least" | "at-most" | "exactly";
}

export interface IREntity {
  localId: string;
  name: string;
  position: Position;
  direction?: Direction;
  recipe?: string;
  infinityFilter?: InfinityFilter;
}

export type PortKind = "belt" | "pipe" | "wire";

/** A function's or resource instance's port. `offset` is function-local before layout, absolute after. */
export interface ResolvedPort {
  side: "north" | "east" | "south" | "west";
  offset: Position;
  direction: Direction;
  kind: PortKind;
  item?: string;
  fluid?: string;
  signal?: string;
}

export const DIRECTION_TO_NUM: Record<"north" | "east" | "south" | "west", Direction> = {
  north: 0,
  east: 4,
  south: 8,
  west: 12,
};

export const DIRECTION_NAME: Record<Direction, string> = {
  0: "north",
  4: "east",
  8: "south",
  12: "west",
};
