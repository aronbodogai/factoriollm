import fs from "node:fs";
import type { IREntity } from "./ir.js";

export interface StateFile {
  version: 1;
  entities: Record<string, IREntity>;
}

export type PlanOp =
  | { op: "create"; localId: string; entity: IREntity }
  | { op: "update"; localId: string; entity: IREntity }
  | { op: "destroy"; localId: string; entity: IREntity };

export function loadState(path: string): StateFile {
  if (!fs.existsSync(path)) {
    return { version: 1, entities: {} };
  }
  const parsed = JSON.parse(fs.readFileSync(path, "utf8")) as StateFile;
  if (parsed.version !== 1) {
    throw new Error(`${path}: unsupported state file version ${parsed.version}`);
  }
  return parsed;
}

export function saveState(path: string, state: StateFile): void {
  fs.writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

type Comparison = "same" | "filter-only" | "different";

function compare(desired: IREntity, current: IREntity): Comparison {
  if (
    desired.name !== current.name ||
    desired.position.x !== current.position.x ||
    desired.position.y !== current.position.y ||
    (desired.direction ?? 0) !== (current.direction ?? 0) ||
    (desired.type ?? null) !== (current.type ?? null)
  ) {
    return "different";
  }
  const sameFilter = JSON.stringify(desired.infinityFilter ?? null) === JSON.stringify(current.infinityFilter ?? null);
  const sameRecipe = (desired.recipe ?? null) === (current.recipe ?? null);
  return sameFilter && sameRecipe ? "same" : "filter-only";
}

/**
 * v1 update policy: only filter/recipe fields update in place. Any other
 * change (position, direction, name) is destroy+recreate.
 */
export function diff(ir: IREntity[], state: StateFile): PlanOp[] {
  const ops: PlanOp[] = [];
  const desiredById = new Map(ir.map((entity) => [entity.localId, entity]));

  for (const [localId, current] of Object.entries(state.entities)) {
    const desired = desiredById.get(localId);
    if (!desired) {
      ops.push({ op: "destroy", localId, entity: current });
      continue;
    }
    const comparison = compare(desired, current);
    if (comparison === "different") {
      ops.push({ op: "destroy", localId, entity: current });
      ops.push({ op: "create", localId, entity: desired });
    } else if (comparison === "filter-only") {
      ops.push({ op: "update", localId, entity: desired });
    }
  }

  for (const desired of ir) {
    if (!state.entities[desired.localId]) {
      ops.push({ op: "create", localId: desired.localId, entity: desired });
    }
  }

  return ops;
}

/** Mutates `state` in place from an apply's per-op results, in op order. Failed ops are left untouched. */
export function applyResults(
  ops: PlanOp[],
  results: { ok: boolean }[],
  state: StateFile,
): void {
  ops.forEach((op, index) => {
    const result = results[index];
    if (!result?.ok) return;
    if (op.op === "destroy") {
      delete state.entities[op.localId];
    } else {
      state.entities[op.localId] = op.entity;
    }
  });
}
