import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { specSchema, type Spec } from "./schema/spec.js";
import { functionSchema, type FunctionDef } from "./schema/function.js";
import { CompileError } from "./errors.js";

interface ZodLikeSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

function parseYamlFile<T>(filePath: string, schema: ZodLikeSchema<T>): T {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = parseDocument(raw, { prettyErrors: true });

  if (doc.errors.length > 0) {
    throw new CompileError(doc.errors.map((e) => `${filePath}: ${e.message}`).join("\n"));
  }

  const value = doc.toJS();
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${filePath}: ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new CompileError(issues.join("\n"));
  }

  return result.data;
}

export function parseSpec(filePath: string): Spec {
  return parseYamlFile(filePath, specSchema);
}

export function parseFunction(filePath: string): FunctionDef {
  return parseYamlFile(filePath, functionSchema);
}

/** Resolves spec.imports (relative to the spec's own directory) into a name -> FunctionDef map. */
export function loadFunctions(spec: Spec, specPath: string): Map<string, FunctionDef> {
  const dir = path.dirname(path.resolve(specPath));
  const functions = new Map<string, FunctionDef>();

  for (const importPath of spec.imports) {
    const resolved = path.isAbsolute(importPath) ? importPath : path.join(dir, importPath);
    const def = parseFunction(resolved);
    if (functions.has(def.name)) {
      throw new CompileError(`duplicate function name "${def.name}" (imported from ${resolved})`);
    }
    functions.set(def.name, def);
  }

  return functions;
}
