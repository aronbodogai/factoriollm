import { getSpeed, setSpeed } from "../deploy/trigger.js";
import type { RconOptions } from "../rcon/client.js";

/**
 * `factoriollm speed` shows the server's game.speed; `speed <n>` sets it and
 * `speed reset` puts it back to 1.
 *
 * game.speed is a multiplier on the simulation rate: 1 is the normal 60
 * updates per second, 10 asks for 600. It is server-global — every surface
 * and every connected player runs at the new rate, so it is a deliberate,
 * visible command rather than a side effect of apply. Production rates the
 * sidecar reports are per game-minute, so they read the same at any speed;
 * only the wall-clock time it takes to reach them changes.
 */
export function parseSpeed(raw: string): number {
  if (raw === "reset") return 1;
  const speed = Number(raw);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(`invalid speed "${raw}": expected a positive number (1 = normal) or "reset"`);
  }
  return speed;
}

export async function speedCommand(target: string | undefined, rconOpts: RconOptions): Promise<void> {
  if (target === undefined) {
    const current = await getSpeed(rconOpts);
    console.log(`game.speed ${current.speed} (tick ${current.tick})`);
    return;
  }

  const result = await setSpeed(parseSpeed(target), rconOpts);
  if (!result.ok) {
    throw new Error(`set speed failed: ${result.error ?? "unknown error"}`);
  }
  console.log(`game.speed ${result.previous} -> ${result.speed} (tick ${result.tick})`);
}
