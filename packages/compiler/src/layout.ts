import type { Spec } from "./schema/spec.js";
import { isFunctionInstance } from "./schema/spec.js";
import type { FunctionDef } from "./schema/function.js";
import type { IREntity, Position, ResolvedPort } from "./ir.js";
import { synthesizeResourceInstance } from "./drillPlacer.js";
import { resolveFunction } from "./resolveFunctions.js";
import { routeConnections } from "./connect.js";
import { CompileError } from "./errors.js";

export interface LayoutInstance {
  id: string;
  entities: IREntity[]; // absolute
  ports: Record<string, ResolvedPort>; // absolute
}

function translate(pos: Position, by: Position): Position {
  return { x: pos.x + by.x, y: pos.y + by.y };
}

export function buildLayoutInstances(spec: Spec, functions: Map<string, FunctionDef>): LayoutInstance[] {
  const seenIds = new Set<string>();
  const layouts: LayoutInstance[] = [];

  for (const instance of spec.instances) {
    if (seenIds.has(instance.id)) {
      throw new CompileError(`duplicate instance id: ${instance.id}`);
    }
    seenIds.add(instance.id);

    let localEntities: IREntity[];
    let localPorts: Record<string, ResolvedPort>;

    if (isFunctionInstance(instance)) {
      if (instance.direction !== "north") {
        throw new CompileError(`${instance.id}: instance rotation isn't implemented yet — only "north" is supported for now.`);
      }
      const def = functions.get(instance.function);
      if (!def) {
        throw new CompileError(`${instance.id}: unknown function "${instance.function}" — check spec.imports`);
      }
      const resolved = resolveFunction(def, instance.id, instance.params);
      localEntities = resolved.entities;
      localPorts = resolved.ports;
    } else {
      const resolved = synthesizeResourceInstance(instance);
      localEntities = resolved.entities;
      localPorts = resolved.ports;
    }

    const entities = localEntities.map((entity) => ({ ...entity, position: translate(entity.position, instance.position) }));
    const ports: Record<string, ResolvedPort> = {};
    for (const [name, port] of Object.entries(localPorts)) {
      ports[name] = { ...port, offset: translate(port.offset, instance.position) };
    }

    layouts.push({ id: instance.id, entities, ports });
  }

  return layouts;
}

export function collectPorts(layouts: LayoutInstance[]): Map<string, ResolvedPort> {
  const ports = new Map<string, ResolvedPort>();
  for (const layout of layouts) {
    for (const [name, port] of Object.entries(layout.ports)) {
      ports.set(`${layout.id}.${name}`, port);
    }
  }
  return ports;
}

/** parse -> resolveFunctions -> layout -> connect -> ir, per docs/FORMAT.md. */
export function buildIR(spec: Spec, functions: Map<string, FunctionDef>): IREntity[] {
  const layouts = buildLayoutInstances(spec, functions);
  const entities = layouts.flatMap((layout) => layout.entities);
  const ports = collectPorts(layouts);

  const { entities: connectorEntities, errors } = routeConnections(spec.connections, ports);
  if (errors.length > 0) {
    throw new CompileError(errors.join("\n"));
  }

  return [...entities, ...connectorEntities];
}
