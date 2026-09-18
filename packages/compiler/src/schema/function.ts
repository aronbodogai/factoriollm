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

export const infinityFilterSchema = z.object({
  name: z.string(),
  count: z.number(),
  mode: z.enum(["at-least", "at-most", "exactly"]),
});

export const entityTemplateSchema = z.object({
  name: z.string(), // literal, or "${param}"
  position: z.object({ x: numberOrExprSchema, y: numberOrExprSchema }),
  direction: directionSchema.default("north"),
  recipe: z.string().optional(), // literal, or "${param}"
  // underground-belt/underground-pipe only: which end this entity is.
  // Needed to cross a single obstructing tile (e.g. another line's belt)
  // that a straight/L-bend run can't route around — added this task after
  // hitting exactly that live (see turn-left-from-south.function.yaml's
  // sibling notes / science-line-2-bridge-c.spec.yaml).
  type: z.enum(["input", "output"]).optional(),
  repeat: numberOrExprSchema.optional(),
  // For an infinity-chest/infinity-pipe entity authored directly in a
  // function (e.g. a test "void" sink: mode "at-most", count 0 deletes
  // anything inserted beyond that) — the resource-instance mechanism
  // (drillPlacer.ts) synthesizes its own chest separately and doesn't use this.
  infinityFilter: infinityFilterSchema.optional(),
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
