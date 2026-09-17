import { z } from "zod";
import { positionSchema, directionSchema } from "./common.js";

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

export const boundingBoxSchema = z.object({
  left: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
});

export const resourceInstanceSchema = z.object({
  id: z.string(),
  resource: z.string(),
  resource_mode: z.enum(["infinity_chest", "real_drills"]),
  position: positionSchema,
  patch_id: z.string().optional(),
  // Required for resource_mode: real_drills — from `factoriollm scan-resources`.
  // Keeping this a literal spec field (not fetched live during compile) is
  // what lets validate/plan stay fully offline, same as everything else.
  bounding_box: boundingBoxSchema.optional(),
});

export const functionInstanceSchema = z.object({
  id: z.string(),
  function: z.string(),
  position: positionSchema,
  direction: directionSchema.default("north"),
  params: z.record(z.union([z.number(), z.string()])).default({}),
});

export const instanceSchema = z.union([resourceInstanceSchema, functionInstanceSchema]);

export const connectionSchema = z.object({
  from: z.string(), // "instanceId.portName"
  to: z.string(),
  kind: z.enum(["belt", "pipe", "wire"]),
});

export const specSchema = z.object({
  kind: z.literal("spec"),
  server: serverSchema,
  imports: z.array(z.string()).default([]),
  instances: z.array(instanceSchema).min(1),
  connections: z.array(connectionSchema).default([]),
});

export type Spec = z.infer<typeof specSchema>;
export type BoundingBox = z.infer<typeof boundingBoxSchema>;
export type ResourceInstance = z.infer<typeof resourceInstanceSchema>;
export type FunctionInstance = z.infer<typeof functionInstanceSchema>;
export type Instance = z.infer<typeof instanceSchema>;
export type Connection = z.infer<typeof connectionSchema>;

export function isFunctionInstance(instance: Instance): instance is FunctionInstance {
  return "function" in instance;
}
