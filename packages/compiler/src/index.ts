// Parse -> resolveFunctions -> layout -> connect -> ir -> state -> planBuilder.
// resolveFunctions/connect land in Phase 2; Phase 1 covers resource-backed
// instances end to end. See docs/FORMAT.md for the target format.

export { CompileError } from "./errors.js";
export { parseSpec } from "./parse.js";
export { buildIR } from "./layout.js";
export { synthesizeResourceInstance } from "./drillPlacer.js";
export { loadState, saveState, diff, applyResults } from "./state.js";
export type { StateFile, PlanOp } from "./state.js";
export { buildPlan } from "./planBuilder.js";
export type { Plan } from "./planBuilder.js";
export type { IREntity, InfinityFilter, Position, Direction } from "./ir.js";
export type { Spec, ResourceInstance } from "./schema/spec.js";
