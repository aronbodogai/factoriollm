import { parseSpec } from "@factoriollm/compiler";
import { rconCommand } from "../rcon/client.js";
import { resolveRconFromSpec } from "../server.js";

export interface PatchSummary {
  patchId: string;
  resourceName: string;
  boundingBox: { left: number; top: number; right: number; bottom: number };
  tileCount: number;
  totalAmount: number;
}

function requireNumberFlag(flags: Map<string, string>, name: string): number {
  const raw = flags.get(name);
  if (raw === undefined) {
    throw new Error(`scan-resources needs --${name} <number>`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`--${name} must be a number, got "${raw}"`);
  }
  return value;
}

export async function scanResourcesCommand(specPath: string, flags: Map<string, string>): Promise<void> {
  const spec = parseSpec(specPath);
  const rconOpts = resolveRconFromSpec(spec, flags);

  const area = {
    left: requireNumberFlag(flags, "left"),
    top: requireNumberFlag(flags, "top"),
    right: requireNumberFlag(flags, "right"),
    bottom: requireNumberFlag(flags, "bottom"),
  };

  const scanOpts = {
    surface: flags.get("surface") ?? spec.server.surface,
    area: [
      [area.left, area.top],
      [area.right, area.bottom],
    ],
    resource: flags.get("resource"),
  };

  // Same trick as apply's plan payload: JSON passed as a Lua string literal, decoded with json_to_table.
  const optsJson = JSON.stringify(scanOpts);
  const luaLiteral = JSON.stringify(optsJson);
  const lua =
    `/silent-command rcon.print(helpers.table_to_json(remote.call(` +
    `"factoriollm","scan_resources",helpers.json_to_table(${luaLiteral}))))`;

  const reply = await rconCommand(lua, rconOpts);
  if (!reply.trim()) {
    throw new Error("empty RCON reply from scan_resources — is the factoriollm mod loaded on the server?");
  }

  const patches = JSON.parse(reply) as PatchSummary[];
  if (patches.length === 0) {
    console.log("no resource patches found in that area");
    return;
  }
  for (const patch of patches) {
    const { left, top, right, bottom } = patch.boundingBox;
    console.log(
      `${patch.patchId}  ${patch.resourceName}  bbox=(${left},${top})-(${right},${bottom})  ` +
        `tiles=${patch.tileCount}  amount=${patch.totalAmount}`,
    );
  }
}
