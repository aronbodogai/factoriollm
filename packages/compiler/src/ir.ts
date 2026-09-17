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
