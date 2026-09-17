import { rconCommand } from "../rcon/client.js";
import type { ServerOptions } from "../server.js";

// remote.call's args and return value both travel as normal RCON reply
// payload, which isn't the size-constrained direction, so a short trigger
// like this is safe even though a large pasted Lua script would not be.
const PING_COMMAND =
  '/silent-command rcon.print(helpers.table_to_json(remote.call("factoriollm","ping")))';

export async function ping(opts: ServerOptions): Promise<void> {
  const reply = await rconCommand(PING_COMMAND, opts);

  if (!reply.trim()) {
    throw new Error(
      "empty RCON reply — is the factoriollm mod loaded on the server? " +
        '(remote.call("factoriollm","ping") returned nothing)',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(reply);
  } catch {
    throw new Error(`unexpected RCON reply (not JSON): ${reply}`);
  }

  console.log(JSON.stringify(parsed, null, 2));
}
