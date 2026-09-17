import { z } from "zod";

export const positionSchema = z.object({ x: z.number(), y: z.number() });

export const rconServerSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.number().default(27015),
  password_env: z.string().optional(),
});

export const serverSchema = z.object({
  rcon: rconServerSchema,
  script_output_dir: z.string(),
  surface: z.string().default("nauvis"),
});

// Phase 1 only supports resource-backed instances (infinity-chest stub).
// Function-backed instances (`function:`, `params:`) land in Phase 2.
export const resourceInstanceSchema = z.object({
  id: z.string(),
  resource: z.string(),
  resource_mode: z.enum(["infinity_chest", "real_drills"]),
  position: positionSchema,
  patch_id: z.string().optional(),
});

export const specSchema = z.object({
  kind: z.literal("spec"),
  server: serverSchema,
  instances: z.array(resourceInstanceSchema).min(1),
});

export type Spec = z.infer<typeof specSchema>;
export type ResourceInstance = z.infer<typeof resourceInstanceSchema>;
