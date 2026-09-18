import { applyResults, saveState } from "@factoriollm/compiler";
import { waitForProduction } from "@factoriollm/smoke";
import { compilePlan } from "./plan.js";
import { triggerApply, setSpeed } from "../deploy/trigger.js";
import { resolveRconFromSpec } from "../server.js";
import { parseSpeed } from "./speed.js";
import type { RconOptions } from "../rcon/client.js";

const DEFAULT_SIDECAR_URL = "http://127.0.0.1:8099";
const DEFAULT_SMOKE_TIMEOUT_MS = 15_000;

/**
 * Fast-forwards the server for the duration of `body`, then restores the
 * speed it found — in a finally, so a failed or thrown check never leaves
 * the server running at 20x. Restores the *previous* value rather than 1 on
 * purpose: if someone had it at 0.5 for their own reasons, that is theirs.
 *
 * Why this helps: --smoke-timeout is wall-clock, but the production a check
 * waits for accrues in game time (a 5s stats window is 300 ticks). At
 * game.speed 10 those 300 ticks take half a real second, so the same
 * timeout covers 10x more of the build's warm-up (inserter swings, furnace
 * heat-up, first crafts) — that, not a bigger timeout, is what makes a
 * build testable in seconds instead of minutes.
 */
async function withGameSpeed<T>(speed: number, rconOpts: RconOptions, body: () => Promise<T>): Promise<T> {
  const set = await setSpeed(speed, rconOpts);
  if (!set.ok || set.previous === undefined) {
    throw new Error(`--smoke-speed: ${set.error ?? "set_speed returned no previous value"}`);
  }
  console.log(`smoke-check: game.speed ${set.previous} -> ${set.speed}`);
  try {
    return await body();
  } finally {
    const restored = await setSpeed(set.previous, rconOpts);
    if (restored.ok) {
      console.log(`smoke-check: game.speed restored to ${restored.speed}`);
    } else {
      // Loud, not fatal: the check's own verdict still stands, but the
      // operator has to know the server was left fast-forwarded.
      console.error(`smoke-check: WARNING could not restore game.speed to ${set.previous}: ${restored.error}`);
    }
  }
}

async function runSmokeCheck(
  flags: Map<string, string>,
  defaultSurface: string,
  rconOpts: () => RconOptions,
): Promise<void> {
  const item = flags.get("smoke-item");
  if (!item) {
    throw new Error("--smoke-check needs --smoke-item <item-name>");
  }
  const sidecarUrl = flags.get("smoke-sidecar") ?? DEFAULT_SIDECAR_URL;
  const surface = flags.get("smoke-surface") ?? defaultSurface;
  const timeoutMs = Number(flags.get("smoke-timeout") ?? DEFAULT_SMOKE_TIMEOUT_MS);
  const window = flags.get("smoke-window") ?? "5s";
  const speedFlag = flags.get("smoke-speed");

  const poll = async () => {
    console.log(`smoke-check: waiting up to ${timeoutMs}ms for "${item}" production on "${surface}" (${sidecarUrl})...`);
    return waitForProduction(sidecarUrl, surface, item, timeoutMs, 1000, window);
  };

  const result = speedFlag === undefined
    ? await poll()
    : await withGameSpeed(parseSpeed(speedFlag), rconOpts(), poll);

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
    // Resolved lazily: a smoke check without --smoke-speed never touches
    // RCON, so it must keep working without a password, as before.
    await runSmokeCheck(flags, spec.server.surface, () => resolveRconFromSpec(spec, flags));
  }
}
