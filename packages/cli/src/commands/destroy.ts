import { parseSpec, loadState, saveState, applyResults, buildPlan, type PlanOp } from "@factoriollm/compiler";
import { triggerApply, deleteSurface } from "../deploy/trigger.js";
import { resolveRconFromSpec } from "../server.js";

export async function destroyCommand(
  specPath: string,
  statePath: string,
  flags: Map<string, string>,
  autoApprove: boolean,
  deleteWholeSurface: boolean,
): Promise<void> {
  const spec = parseSpec(specPath);
  const state = loadState(statePath);

  if (deleteWholeSurface) {
    await destroyBySurfaceDelete(spec, state, statePath, flags, autoApprove);
    return;
  }

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

/**
 * Deletes the whole surface instead of issuing one destroy op per entity.
 *
 * Only works on a factoriollm-managed (fllm-*) surface — the mod refuses
 * anything else, and it refuses rather than silently no-ops so a typo'd
 * surface name can't quietly leave a live base standing while the state file
 * is wiped. Cheaper than per-entity teardown and immune to state drift: it
 * removes entities the state file never knew about too, which per-entity
 * destroy by construction cannot.
 */
async function destroyBySurfaceDelete(
  spec: ReturnType<typeof parseSpec>,
  state: ReturnType<typeof loadState>,
  statePath: string,
  flags: Map<string, string>,
  autoApprove: boolean,
): Promise<void> {
  const surface = spec.server.surface;
  const known = Object.keys(state.entities).length;
  console.log(`delete surface "${surface}" (${known} tracked entities, plus anything untracked on it)`);

  if (!autoApprove) {
    console.log("\nre-run with --auto-approve to destroy");
    process.exitCode = 2;
    return;
  }

  const rconOpts = resolveRconFromSpec(spec, flags);
  const result = await deleteSurface(surface, rconOpts);

  if (!result.ok) {
    console.error(`FAILED: ${result.error ?? "unknown error"}`);
    process.exitCode = 1;
    return;
  }

  // The surface being already gone still clears state: either way nothing
  // this spec created is left on the server.
  state.entities = {};
  saveState(statePath, state);
  console.log(result.deleted ? `ok deleted surface "${surface}"` : `ok surface "${surface}" was already gone`);
}
