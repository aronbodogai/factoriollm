import type { PlanOp } from "./state.js";

export interface Plan {
  ops: PlanOp[];
  summary: string[];
}

const MARKER: Record<PlanOp["op"], string> = {
  create: "+ create",
  update: "~ update",
  destroy: "- destroy",
};

export function buildPlan(ops: PlanOp[]): Plan {
  const summary = ops.map((op) => {
    const { x, y } = op.entity.position;
    return `${MARKER[op.op]} ${op.localId}: ${op.entity.name} @ (${x},${y})`;
  });
  return { ops, summary };
}
