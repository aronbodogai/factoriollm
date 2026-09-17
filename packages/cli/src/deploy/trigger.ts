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
export async function triggerApply(payload: unknown, rconOpts: RconOptions): Promise<OpResult[]> {
  const payloadJson = JSON.stringify(payload);
  if (payloadJson.length > MAX_PAYLOAD_CHARS) {
    throw new Error(
      `plan payload too large for a single RCON command (${payloadJson.length} chars, limit ${MAX_PAYLOAD_CHARS}) — chunked delivery isn't implemented yet`,
    );
  }

  const luaLiteral = JSON.stringify(payloadJson);
  const lua =
    `/silent-command rcon.print(helpers.table_to_json(remote.call(` +
    `"factoriollm","apply",helpers.json_to_table(${luaLiteral}))))`;

  const reply = await rconCommand(lua, rconOpts);
  if (!reply.trim()) {
    throw new Error("empty RCON reply from apply — is the factoriollm mod loaded on the server?");
  }
  try {
    return JSON.parse(reply) as OpResult[];
  } catch {
    throw new Error(`unexpected RCON reply (not JSON): ${reply}`);
  }
}
