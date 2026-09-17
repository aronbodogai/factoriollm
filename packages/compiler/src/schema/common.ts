import { z } from "zod";

export const positionSchema = z.object({ x: z.number(), y: z.number() });

/** A literal number, or a `"${expr}"` template resolved at compile time (see expr.ts). */
export const numberOrExprSchema = z.union([z.number(), z.string()]);

export const directionSchema = z.enum(["north", "east", "south", "west"]);
