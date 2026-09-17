export interface ServerOptions {
  host: string;
  port: number;
  password: string;
}

/**
 * Resolve RCON connection settings from CLI flags first, then environment
 * variables, matching the sibling factorio-broadcast dev server's defaults
 * (127.0.0.1:27015) so `factoriollm ping` works against it out of the box.
 */
export function resolveServerOptions(flags: Map<string, string>): ServerOptions {
  const host = flags.get("host") ?? process.env.FACTORIOLLM_RCON_HOST ?? "127.0.0.1";
  const port = Number(flags.get("port") ?? process.env.FACTORIOLLM_RCON_PORT ?? "27015");
  const password = flags.get("password") ?? process.env.FACTORIOLLM_RCON_PASSWORD;

  if (!password) {
    throw new Error(
      "RCON password required: set FACTORIOLLM_RCON_PASSWORD or pass --password <value>",
    );
  }
  if (!Number.isFinite(port)) {
    throw new Error(`invalid RCON port: ${flags.get("port") ?? process.env.FACTORIOLLM_RCON_PORT}`);
  }

  return { host, port, password };
}

export function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`flag --${key} needs a value`);
      }
      flags.set(key, value);
      i++;
    }
  }
  return flags;
}
