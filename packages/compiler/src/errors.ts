/** Compile-time failure the user can act on directly (bad YAML, schema violation, unroutable connection, ...). */
export class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompileError";
  }
}
