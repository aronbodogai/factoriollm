import { z } from "zod";
import { numberOrExprSchema, directionSchema } from "./common.js";

export const paramSchema = z.object({
  type: z.enum(["int", "string"]),
  default: z.union([z.number(), z.string()]).optional(),
});

export const portSchema = z.object({
  side: directionSchema,
  offset: z.object({ x: numberOrExprSchema, y: numberOrExprSchema }),
  direction: directionSchema,
  kind: z.enum(["belt", "pipe", "wire"]),
  item: z.string().optional(),
  fluid: z.string().optional(),
  signal: z.string().optional(),
});

export const entityTemplateSchema = z.object({
  name: z.string(), // literal, or "${param}"
  position: z.object({ x: numberOrExprSchema, y: numberOrExprSchema }),
  direction: directionSchema.default("north"),
  recipe: z.string().optional(), // literal, or "${param}"
  repeat: numberOrExprSchema.optional(),
});

export const functionSchema = z.object({
  kind: z.literal("function"),
  name: z.string(),
  params: z.record(paramSchema).default({}),
  size: z.object({ width: numberOrExprSchema, height: numberOrExprSchema }),
  entities: z.array(entityTemplateSchema),
  ports: z.record(portSchema),
});

export type FunctionDef = z.infer<typeof functionSchema>;
export type Param = z.infer<typeof paramSchema>;
export type PortDef = z.infer<typeof portSchema>;
export type EntityTemplate = z.infer<typeof entityTemplateSchema>;
