import { parseSpec, loadState, saveState, applyResults, buildPlan, type PlanOp } from "@factoriollm/compiler";
import { triggerApply } from "../deploy/trigger.js";
import { resolveRconFromSpec } from "../server.js";

export async function destroyCommand(
  specPath: string,
  statePath: string,
  flags: Map<string, string>,
  autoApprove: boolean,
): Promise<void> {
  const spec = parseSpec(specPath);
  const state = loadState(statePath);

  const ops: PlanOp[] = Object.entries(state.entities).map(([localId, entity]) => ({
    op: "destroy",
    localId,
    entity,
  }));

  if (ops.length === 0) {
    console.log("nothing to destroy");
    return;
  }

  const plan = buildPlan(ops);
  console.log(plan.summary.join("\n"));

  if (!autoApprove) {
    console.log("\nre-run with --auto-approve to destroy");
    process.exitCode = 2;
    return;
  }

  const rconOpts = resolveRconFromSpec(spec, flags);
  const results = await triggerApply({ surface: spec.server.surface, ops }, rconOpts);

  applyResults(ops, results, state);
  saveState(statePath, state);

  for (const result of results) {
    console.log(`${result.ok ? "ok" : "FAILED"} ${result.localId}${result.error ? `: ${result.error}` : ""}`);
  }
  if (results.some((r) => !r.ok)) {
    process.exitCode = 1;
  }
}
