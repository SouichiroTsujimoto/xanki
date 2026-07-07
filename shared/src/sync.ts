import { z } from "zod";

export const cardKindSchema = z.enum(["text", "image", "qa"]);
export type CardKind = z.infer<typeof cardKindSchema>;

export const blobPrepareRequestSchema = z.object({
  hash: z.string().length(64),
  size: z.number().int().positive(),
  mime: z.string(),
});

export const blobPrepareResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("exists") }),
  z.object({
    status: z.literal("upload"),
    url: z.string().url(),
    expires_at: z.number().int(),
  }),
]);

export const blobCommitRequestSchema = z.object({
  hash: z.string().length(64),
});

export const accountStorageResponseSchema = z.object({
  rev: z.number().int(),
  storageUsed: z.number().int(),
  storageLimit: z.number().int(),
  plan: z.enum(["free", "pro"]),
  aiCreditsRemaining: z.number().int(),
});

export type AccountStorageResponse = z.infer<typeof accountStorageResponseSchema>;

export const revisionEventSchema = z.object({
  rev: z.number().int(),
});

export type RevisionEvent = z.infer<typeof revisionEventSchema>;
