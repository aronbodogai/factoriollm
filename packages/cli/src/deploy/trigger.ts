import { rconCommand, type RconOptions } from "../rcon/client.js";

export interface OpResult {
  localId: string;
  ok: boolean;
  error?: string;
}

// Empirically verified against the live dev server: a single RCON command
// carrying a 100,000-char string round-tripped correctly (test harness argv
// limits, not RCON/Factorio itself, are what capped how far that probe went).
// This ceiling is deliberately conservative — comfortably below the verified
// working size, with no chunking implemented yet if a spec ever needs more.
const MAX_PAYLOAD_CHARS = 50_000;

/**
 * Sends the plan directly as the RCON command's argument — there is no
 * `helpers.read_file` in this API (Lua can WRITE to script-output but not
 * read arbitrary files back; confirmed live, not assumed), so the file-drop
 * design this project started with doesn't work. Instead the JSON is passed
 * as a Lua STRING literal (JSON and Lua table-literal syntax aren't
 * compatible) and decoded server-side with `helpers.json_to_table` before
 * `factoriollm.apply` ever sees it, so the mod receives an actual Lua table,
 * not a string it has to parse itself.
 */
async function callRemote<T>(fnName: string, payload: unknown, rconOpts: RconOptions): Promise<T> {
  const payloadJson = JSON.stringify(payload);
  if (payloadJson.length > MAX_PAYLOAD_CHARS) {
    throw new Error(
      `payload too large for a single RCON command (${payloadJson.length} chars, limit ${MAX_PAYLOAD_CHARS}) — chunked delivery isn't implemented yet`,
    );
  }

  const luaLiteral = JSON.stringify(payloadJson);
  const lua =
    `/silent-command rcon.print(helpers.table_to_json(remote.call(` +
    `"factoriollm","${fnName}",helpers.json_to_table(${luaLiteral}))))`;

  const reply = await rconCommand(lua, rconOpts);
  if (!reply.trim()) {
    throw new Error(`empty RCON reply from ${fnName} — is the factoriollm mod loaded on the server?`);
  }
  try {
    return JSON.parse(reply) as T;
  } catch {
    throw new Error(`unexpected RCON reply (not JSON): ${reply}`);
  }
}

export async function triggerApply(payload: unknown, rconOpts: RconOptions): Promise<OpResult[]> {
  return callRemote<OpResult[]>("apply", payload, rconOpts);
}

export interface ManagedSurface {
  name: string;
  entityCount: number;
}

export async function listSurfaces(rconOpts: RconOptions): Promise<ManagedSurface[]> {
  // helpers.table_to_json turns an empty Lua table into {} rather than [],
  // so "no managed surfaces" arrives as an object, not an array.
  const reply = await callRemote<ManagedSurface[] | Record<string, never>>("list_surfaces", {}, rconOpts);
  return Array.isArray(reply) ? reply : [];
}

export interface DeleteSurfaceResult {
  ok: boolean;
  deleted?: boolean;
  error?: string;
}

export async function deleteSurface(surface: string, rconOpts: RconOptions): Promise<DeleteSurfaceResult> {
  return callRemote<DeleteSurfaceResult>("delete_surface", { surface }, rconOpts);
}

export interface SpeedResult {
  speed: number;
  tick: number;
}

export interface SetSpeedResult {
  ok: boolean;
  previous?: number;
  speed?: number;
  tick?: number;
  error?: string;
}

/** Reads game.speed (1 = normal, 60 UPS). Server-global — there is no per-surface speed. */
export async function getSpeed(rconOpts: RconOptions): Promise<SpeedResult> {
  return callRemote<SpeedResult>("get_speed", {}, rconOpts);
}

/**
 * Sets game.speed and returns the value it replaced, so a caller that
 * fast-forwards for a measurement can put back exactly what it found. The
 * mod is the authority on the allowed range; it refuses rather than clamps.
 */
export async function setSpeed(speed: number, rconOpts: RconOptions): Promise<SetSpeedResult> {
  return callRemote<SetSpeedResult>("set_speed", { speed }, rconOpts);
}
