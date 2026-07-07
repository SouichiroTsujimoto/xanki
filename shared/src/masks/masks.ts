import { z } from "zod";

export const maskColorSchema = z.enum([
  "chartreuse",
  "yellow",
  "pink",
  "cyan",
  "orange",
]);

export const textMaskSchema = z.object({
  type: z.literal("range"),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const rectMaskSchema = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  color: maskColorSchema.optional(),
});

export const ocrMaskSchema = z.object({
  type: z.literal("ocr"),
  wordIds: z.array(z.number().int().nonnegative()),
  color: maskColorSchema.optional(),
});

export const imageMaskSchema = z.discriminatedUnion("type", [
  rectMaskSchema,
  ocrMaskSchema,
]);

export const textMasksSchema = z.array(textMaskSchema);
export const imageMasksSchema = z.array(imageMaskSchema);

export type MaskColor = z.infer<typeof maskColorSchema>;
export type TextMask = z.infer<typeof textMaskSchema>;
export type RectMask = z.infer<typeof rectMaskSchema>;
export type OcrMask = z.infer<typeof ocrMaskSchema>;
export type ImageMask = z.infer<typeof imageMaskSchema>;

export const ocrWordSchema = z.object({
  id: z.number().int(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const ocrDataSchema = z.object({
  fullText: z.string(),
  words: z.array(ocrWordSchema),
});

export type OcrWord = z.infer<typeof ocrWordSchema>;
export type OcrData = z.infer<typeof ocrDataSchema>;
