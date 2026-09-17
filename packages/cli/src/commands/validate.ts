import { parseSpec, buildIR } from "@factoriollm/compiler";

export async function validate(specPath: string): Promise<void> {
  const spec = parseSpec(specPath);
  const ir = buildIR(spec);
  console.log(`ok: ${ir.length} entit${ir.length === 1 ? "y" : "ies"} resolved`);
}
