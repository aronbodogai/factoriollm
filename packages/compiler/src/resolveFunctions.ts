import type { FunctionDef } from "./schema/function.js";
import type { IREntity, ResolvedPort } from "./ir.js";
import { DIRECTION_TO_NUM } from "./ir.js";
import { resolveNumber, resolveString } from "./expr.js";
import { CompileError } from "./errors.js";
import { centerPosition } from "./footprints.js";

export interface ResolvedFunction {
  width: number;
  height: number;
  entities: IREntity[]; // function-local positions (not yet translated by instance.position)
  ports: Record<string, ResolvedPort>; // function-local offsets
}

type ParamScope = Record<string, number | string>;

function numericScope(scope: ParamScope): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(scope)) {
    if (typeof value === "number") out[key] = value;
  }
  return out;
}

/** Binds an instance's params against a function's declared params, applying defaults and requiring the rest. */
function bindParams(def: FunctionDef, instanceId: string, rawParams: Record<string, number | string>): ParamScope {
  const scope: ParamScope = {};
  for (const [name, paramDef] of Object.entries(def.params)) {
    const provided = rawParams[name];
    const value = provided ?? paramDef.default;
    if (value === undefined) {
      throw new CompileError(`${instanceId}: missing required param "${name}" for function "${def.name}"`);
    }
    if (paramDef.type === "int" && typeof value !== "number") {
      throw new CompileError(`${instanceId}: param "${name}" expects a number, got "${value}"`);
    }
    if (paramDef.type === "string" && typeof value !== "string") {
      throw new CompileError(`${instanceId}: param "${name}" expects a string, got ${JSON.stringify(value)}`);
    }
    scope[name] = value;
  }
  return scope;
}

export function resolveFunction(
  def: FunctionDef,
  instanceId: string,
  rawParams: Record<string, number | string>,
): ResolvedFunction {
  const scope = bindParams(def, instanceId, rawParams);

  const width = resolveNumber(def.size.width, numericScope(scope));
  const height = resolveNumber(def.size.height, numericScope(scope));

  const entities: IREntity[] = [];
  def.entities.forEach((template, templateIndex) => {
    const repeatCount = template.repeat !== undefined ? resolveNumber(template.repeat, numericScope(scope)) : 1;
    for (let i = 0; i < repeatCount; i++) {
      const loopScope = { ...numericScope(scope), i };
      const x = resolveNumber(template.position.x, loopScope);
      const y = resolveNumber(template.position.y, loopScope);
      const name = resolveString(template.name, scope);
      const recipe = template.recipe !== undefined ? resolveString(template.recipe, scope) : undefined;
      entities.push({
        localId: `${instanceId}.e${templateIndex}[${i}]`,
        name,
        // template.position is authored as the entity's top-left tile (an
        // intuitive authoring convention); Factorio wants the collision-box
        // center — see footprints.ts.
        position: centerPosition({ x, y }, name),
        direction: DIRECTION_TO_NUM[template.direction],
        recipe,
        infinityFilter: template.infinityFilter,
      });
    }
  });

  const ports: Record<string, ResolvedPort> = {};
  for (const [portName, port] of Object.entries(def.ports)) {
    ports[portName] = {
      side: port.side,
      offset: {
        x: resolveNumber(port.offset.x, numericScope(scope)),
        y: resolveNumber(port.offset.y, numericScope(scope)),
      },
      direction: DIRECTION_TO_NUM[port.direction],
      kind: port.kind,
      item: port.item,
      fluid: port.fluid,
      signal: port.signal,
    };
  }

  return { width, height, entities, ports };
}
