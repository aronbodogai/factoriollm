import { applyResults, saveState } from "@factoriollm/compiler";
import { waitForProduction } from "@factoriollm/smoke";
import { compilePlan } from "./plan.js";
import { triggerApply } from "../deploy/trigger.js";
import { resolveRconFromSpec } from "../server.js";

const DEFAULT_SIDECAR_URL = "http://127.0.0.1:8099";
const DEFAULT_SMOKE_TIMEOUT_MS = 15_000;

async function runSmokeCheck(flags: Map<string, string>, defaultSurface: string): Promise<void> {
  const item = flags.get("smoke-item");
  if (!item) {
    throw new Error("--smoke-check needs --smoke-item <item-name>");
  }
  const sidecarUrl = flags.get("smoke-sidecar") ?? DEFAULT_SIDECAR_URL;
  const surface = flags.get("smoke-surface") ?? defaultSurface;
  const timeoutMs = Number(flags.get("smoke-timeout") ?? DEFAULT_SMOKE_TIMEOUT_MS);
  const window = flags.get("smoke-window") ?? "5s";

  console.log(`smoke-check: waiting up to ${timeoutMs}ms for "${item}" production on "${surface}" (${sidecarUrl})...`);
  const result = await waitForProduction(sidecarUrl, surface, item, timeoutMs, 1000, window);

  if (result.ok) {
    console.log(`smoke-check: ok — ${item} producing at ${result.producedRate}/min (after ${result.elapsedMs}ms)`);
  } else {
    console.error(`smoke-check: FAILED — no "${item}" production detected within ${timeoutMs}ms`);
    process.exitCode = 1;
  }
}

export async function applyCommand(
  specPath: string,
  statePath: string,
  flags: Map<string, string>,
  autoApprove: boolean,
  smokeCheck: boolean,
): Promise<void> {
  const { spec, plan, state } = compilePlan(specPath, statePath);

  if (plan.ops.length === 0) {
    console.log("no changes");
  } else {
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

  if (smokeCheck) {
    await runSmokeCheck(flags, spec.server.surface);
  }
}
