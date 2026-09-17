#!/usr/bin/env node
import { ping } from "./commands/ping.js";
import { parseFlags, resolveServerOptions } from "./server.js";

const USAGE = `usage: factoriollm <command> [--host <host>] [--port <port>] [--password <password>]

commands:
  ping   round-trip an RCON call to the factoriollm companion mod

RCON settings can also come from FACTORIOLLM_RCON_HOST / _PORT / _PASSWORD.`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "ping": {
      const opts = resolveServerOptions(parseFlags(rest));
      await ping(opts);
      break;
    }
    case undefined:
    case "-h":
    case "--help":
      console.log(USAGE);
      break;
    default:
      console.error(`unknown command: ${command}\n\n${USAGE}`);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
