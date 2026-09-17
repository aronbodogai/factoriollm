// Parse -> resolveFunctions -> layout -> connect -> ir -> state -> planBuilder.
// See docs/FORMAT.md for the target format.

export { CompileError } from "./errors.js";
export { parseSpec, parseFunction, loadFunctions } from "./parse.js";
export { buildIR, buildLayoutInstances, collectPorts } from "./layout.js";
export type { LayoutInstance } from "./layout.js";
export { resolveFunction } from "./resolveFunctions.js";
export type { ResolvedFunction } from "./resolveFunctions.js";
export { routeConnections } from "./connect.js";
export { synthesizeResourceInstance } from "./drillPlacer.js";
export { loadState, saveState, diff, applyResults } from "./state.js";
export type { StateFile, PlanOp } from "./state.js";
export { buildPlan } from "./planBuilder.js";
export type { Plan } from "./planBuilder.js";
export type { IREntity, InfinityFilter, Position, Direction, ResolvedPort, PortKind } from "./ir.js";
export type { Spec, ResourceInstance, FunctionInstance, Instance, Connection } from "./schema/spec.js";
export { isFunctionInstance } from "./schema/spec.js";
export type { FunctionDef, Param, PortDef, EntityTemplate } from "./schema/function.js";
