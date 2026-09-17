import { applyResults, saveState } from "@factoriollm/compiler";
import { compilePlan } from "./plan.js";
import { triggerApply } from "../deploy/trigger.js";
import { resolveRconFromSpec } from "../server.js";

export async function applyCommand(
  specPath: string,
  statePath: string,
  flags: Map<string, string>,
  autoApprove: boolean,
): Promise<void> {
  const { spec, plan, state } = compilePlan(specPath, statePath);

  if (plan.ops.length === 0) {
    console.log("no changes");
    return;
  }

  console.log(plan.summary.join("\n"));

  if (!autoApprove) {
    console.log("\nre-run with --auto-approve to apply");
    process.exitCode = 2;
    return;
  }

  const rconOpts = resolveRconFromSpec(spec, flags);
  const results = await triggerApply({ surface: spec.server.surface, ops: plan.ops }, rconOpts);

  applyResults(plan.ops, results, state);
  saveState(statePath, state);

  for (const result of results) {
    console.log(`${result.ok ? "ok" : "FAILED"} ${result.localId}${result.error ? `: ${result.error}` : ""}`);
  }
  if (results.some((r) => !r.ok)) {
    process.exitCode = 1;
  }
}
