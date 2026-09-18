const BOOLEAN_FLAGS = new Set(["auto-approve", "smoke-check", "delete-surface"]);

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string>;
  booleanFlags: Set<string>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string>();
  const booleanFlags = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        booleanFlags.add(key);
        continue;
      }
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`flag --${key} needs a value`);
      }
      flags.set(key, value);
      i++;
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags, booleanFlags };
}
