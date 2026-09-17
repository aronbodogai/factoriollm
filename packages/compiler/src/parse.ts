import fs from "node:fs";
import { parseDocument } from "yaml";
import { specSchema, type Spec } from "./schema/spec.js";
import { CompileError } from "./errors.js";

export function parseSpec(filePath: string): Spec {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = parseDocument(raw, { prettyErrors: true });

  if (doc.errors.length > 0) {
    throw new CompileError(doc.errors.map((e) => `${filePath}: ${e.message}`).join("\n"));
  }

  const value = doc.toJS();
  const result = specSchema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${filePath}: ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new CompileError(issues.join("\n"));
  }

  return result.data;
}
