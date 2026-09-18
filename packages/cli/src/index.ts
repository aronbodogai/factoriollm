#!/usr/bin/env node
import { ping } from "./commands/ping.js";
import { validate } from "./commands/validate.js";
import { planCommand, defaultStatePath } from "./commands/plan.js";
import { applyCommand } from "./commands/apply.js";
import { destroyCommand } from "./commands/destroy.js";
import { scanResourcesCommand } from "./commands/scanResources.js";
import { surfacesCommand } from "./commands/surfaces.js";
import { parseArgs } from "./args.js";
import { resolveServerOptions } from "./server.js";

const USAGE = `usage: factoriollm <command> [args] [--host <host>] [--port <port>] [--password <password>]

commands:
  ping                          round-trip an RCON call to the companion mod
  validate <spec.yaml>          parse + resolve, no server contact
  plan <spec.yaml> [--state f]  show the diff against state, no changes made
  apply <spec.yaml> [--state f] [--auto-approve] [--smoke-check --smoke-item X [--smoke-sidecar url] [--smoke-surface X] [--smoke-timeout ms]]
  destroy <spec.yaml> [--state f] [--auto-approve] [--delete-surface]
  surfaces                      list the factoriollm-managed (fllm-*) surfaces
  scan-resources <spec.yaml> --left N --top N --right N --bottom N [--resource X] [--surface X]

RCON settings default to spec.server.rcon (ping falls back to
FACTORIOLLM_RCON_HOST / _PORT / _PASSWORD); --host/--port/--password override
either.`;

function requireSpecPath(positionals: string[]): string {
  const specPath = positionals[0];
  if (!specPath) {
    throw new Error(`missing <spec.yaml> argument\n\n${USAGE}`);
  }
  return specPath;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { positionals, flags, booleanFlags } = parseArgs(rest);

  switch (command) {
    case "ping":
      await ping(resolveServerOptions(flags));
      break;

    case "validate":
      await validate(requireSpecPath(positionals));
      break;

    case "plan": {
      const specPath = requireSpecPath(positionals);
      const statePath = flags.get("state") ?? defaultStatePath(specPath);
      await planCommand(specPath, statePath);
      break;
    }

    case "apply": {
      const specPath = requireSpecPath(positionals);
      const statePath = flags.get("state") ?? defaultStatePath(specPath);
      await applyCommand(specPath, statePath, flags, booleanFlags.has("auto-approve"), booleanFlags.has("smoke-check"));
      break;
    }

    case "destroy": {
      const specPath = requireSpecPath(positionals);
      const statePath = flags.get("state") ?? defaultStatePath(specPath);
      await destroyCommand(
        specPath,
        statePath,
        flags,
        booleanFlags.has("auto-approve"),
        booleanFlags.has("delete-surface"),
      );
      break;
    }

    case "surfaces":
      await surfacesCommand(resolveServerOptions(flags));
      break;

    case "scan-resources": {
      const specPath = requireSpecPath(positionals);
      await scanResourcesCommand(specPath, flags);
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
