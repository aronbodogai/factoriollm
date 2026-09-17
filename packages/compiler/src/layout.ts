import type { Spec } from "./schema/spec.js";
import type { IREntity } from "./ir.js";
import { synthesizeResourceInstance } from "./drillPlacer.js";
import { CompileError } from "./errors.js";

/**
 * Phase 1: resource-backed instances only, no functions, no connections.
 * Function resolution (params/repeat/expr) and the port-connector router
 * land in Phase 2 — this will grow into the full
 * parse -> resolveFunctions -> layout -> connect pipeline described in
 * docs/FORMAT.md.
 */
export function buildIR(spec: Spec): IREntity[] {
  const entities: IREntity[] = [];
  const seenIds = new Set<string>();

  for (const instance of spec.instances) {
    if (seenIds.has(instance.id)) {
      throw new CompileError(`duplicate instance id: ${instance.id}`);
    }
    seenIds.add(instance.id);
    entities.push(...synthesizeResourceInstance(instance));
  }

  return entities;
}
