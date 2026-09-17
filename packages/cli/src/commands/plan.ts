import path from "node:path";
import { parseSpec, loadFunctions, buildIR, loadState, diff, buildPlan, type Spec, type Plan, type StateFile } from "@factoriollm/compiler";

export function defaultStatePath(specPath: string): string {
  return path.join(path.dirname(path.resolve(specPath)), "factoriollm.state.json");
}

export interface Compiled {
  spec: Spec;
  plan: Plan;
  state: StateFile;
}

/** Shared by plan/apply: compile the spec and diff it against state. Throws CompileError on bad input. */
export function compilePlan(specPath: string, statePath: string): Compiled {
  const spec = parseSpec(specPath);
  const functions = loadFunctions(spec, specPath);
  const ir = buildIR(spec, functions);
  const state = loadState(statePath);
  const ops = diff(ir, state);
  const plan = buildPlan(ops);
  return { spec, plan, state };
}

export async function planCommand(specPath: string, statePath: string): Promise<void> {
  const { plan } = compilePlan(specPath, statePath);
  if (plan.ops.length === 0) {
    console.log("no changes");
    return;
  }
  console.log(plan.summary.join("\n"));
  process.exitCode = 2;
}
