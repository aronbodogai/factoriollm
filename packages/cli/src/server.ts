import type { Spec } from "@factoriollm/compiler";

export interface ServerOptions {
  host: string;
  port: number;
  password: string;
}

/** For `ping`, which has no spec file to read connection settings from. */
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

/** For spec-driven commands (plan/apply/destroy/screenshot) — spec.server.rcon wins, flags override it. */
export function resolveRconFromSpec(spec: Spec, flags: Map<string, string>): ServerOptions {
  const host = flags.get("host") ?? spec.server.rcon.host;
  const port = Number(flags.get("port") ?? spec.server.rcon.port);
  const passwordEnvVar = spec.server.rcon.password_env ?? "FACTORIOLLM_RCON_PASSWORD";
  const password = flags.get("password") ?? process.env[passwordEnvVar];

  if (!password) {
    throw new Error(
      `RCON password required: set ${passwordEnvVar} (or FACTORIOLLM_RCON_PASSWORD) or pass --password <value>`,
    );
  }
  if (!Number.isFinite(port)) {
    throw new Error(`invalid RCON port: ${flags.get("port") ?? spec.server.rcon.port}`);
  }

  return { host, port, password };
}
