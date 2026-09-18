import { listSurfaces } from "../deploy/trigger.js";
import type { RconOptions } from "../rcon/client.js";

/**
 * Lists the factoriollm-managed (fllm-*) surfaces on the server. Other
 * surfaces — nauvis, Space Age planets, another mod's — are deliberately not
 * listed: they are not deploy targets and not ours to delete.
 */
export async function surfacesCommand(rconOpts: RconOptions): Promise<void> {
  const surfaces = await listSurfaces(rconOpts);
  if (surfaces.length === 0) {
    console.log("no fllm-* surfaces on the server yet");
    return;
  }
  for (const surface of surfaces) {
    console.log(`${surface.name}	${surface.entityCount} entities`);
  }
}
