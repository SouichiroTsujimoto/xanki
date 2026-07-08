import { createAiGateway, type AiGatewaySettings } from "ai-gateway-provider";
import { createGoogleGenerativeAI } from "ai-gateway-provider/providers/google";
import { unified } from "ai-gateway-provider/providers/unified";
import { generateObject, streamText, zodSchema } from "ai";
import { z } from "zod";
import type { Env } from "../../env";

export class AiUnavailableError extends Error {
  constructor() {
    super("ai_unavailable");
    this.name = "AiUnavailableError";
  }
}

const qaItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  choices: z.array(z.string()).optional(),
});

const qaGenerateSchema = z.object({
  items: z.array(qaItemSchema),
});

export type QaGenerateItem = z.infer<typeof qaItemSchema>;

export type AiTier = "fast" | "thinking";

export const AI_CREDIT_COST: Record<AiTier, number> = {
  fast: 1,
  thinking: 2,
};

/** Unified Billing 対応。DeepSeek は対象外（BYOK が必要）。 */
export const DEFAULT_AI_MODEL = "google-ai-studio/gemini-2.5-flash";

function isAiConfigured(env: Env): boolean {
  return Boolean(env.CF_ACCOUNT_ID && env.AI_GATEWAY_TOKEN);
}

function createGateway(env: Env) {
  const accountId = env.CF_ACCOUNT_ID;
  const apiKey = env.AI_GATEWAY_TOKEN;
  if (!accountId || !apiKey) {
    throw new AiUnavailableError();
  }

  const settings: AiGatewaySettings = {
    accountId,
    gateway: env.AI_GATEWAY_ID ?? "default",
    apiKey,
  };
  return createAiGateway(settings);
}

/** `google-ai-studio/gemini-2.5-flash` → `gemini-2.5-flash` */
export function resolveGoogleModelId(modelId: string): string | null {
  const googleAiStudio = modelId.match(/^google-ai-studio\/(.+)$/);
  if (googleAiStudio) return googleAiStudio[1];
  const google = modelId.match(/^google\/(.+)$/);
  if (google) return google[1];
  return null;
}

export function resolveModelForTier(env: Env, tier: AiTier): string {
  if (tier === "thinking") {
    return env.AI_MODEL_THINKING ?? env.AI_MODEL ?? DEFAULT_AI_MODEL;
  }
  return env.AI_MODEL_FAST ?? env.AI_MODEL ?? DEFAULT_AI_MODEL;
}

export function getCreditCostForTier(tier: AiTier): number {
  return AI_CREDIT_COST[tier];
}

function createModelForId(env: Env, modelId: string) {
  const gateway = createGateway(env);
  return gateway(unified(modelId));
}

/** unified() は responseFormat 非対応のため、構造化出力はネイティブ Google を使う */
function createObjectModelForId(env: Env, modelId: string) {
  const gateway = createGateway(env);
  const googleModelId = resolveGoogleModelId(modelId);
  if (googleModelId) {
    const google = createGoogleGenerativeAI();
    return gateway(google(googleModelId));
  }
  return gateway(unified(modelId));
}

function createChatModel(env: Env) {
  return createModelForId(env, resolveModelForTier(env, "fast"));
}

function responseBody(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const body = (error as { responseBody?: string }).responseBody;
  return typeof body === "string" ? body.toLowerCase() : "";
}

/** DeepSeek 等、Unified Billing 非対応プロバイダで BYOK 未設定のとき */
export function isAiProviderError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { statusCode?: number };
  if (candidate.statusCode !== 401) return false;
  return responseBody(error).includes("governor");
}

export function isAiAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { statusCode?: number };
  if (candidate.statusCode !== 401) return false;
  const body = responseBody(error);
  if (body.includes("governor")) return false;
  return body.includes("unauthorized") || body.includes("authentication");
}

export function mapAiCallError(error: unknown): string {
  if (error instanceof AiUnavailableError) return "ai_unavailable";
  if (isAiProviderError(error)) return "ai_provider_unavailable";
  if (isAiAuthError(error)) return "ai_auth_failed";
  return "ai_failed";
}

export function isDevAiBypass(env: Env): boolean {
  return env.APP_URL.startsWith("http://localhost");
}

export function canUseAi(
  env: Env,
  ent: { plan: string; aiCreditsRemaining: number },
  cost = 1,
): boolean {
  if (isDevAiBypass(env)) return true;
  return ent.plan === "pro" && ent.aiCreditsRemaining >= cost;
}

export interface SourceImage {
  data: Uint8Array;
  mime: string;
}

export async function generateCardsFromSource(
  env: Env,
  params: {
    text?: string;
    images?: SourceImage[];
    count: number;
    kind: "qa" | "choice";
    tier: AiTier;
  },
): Promise<{ items: QaGenerateItem[] }> {
  if (!isAiConfigured(env)) {
    throw new AiUnavailableError();
  }

  const kindInstruction =
    params.kind === "choice"
      ? "Each item must include a choices array with exactly 4 options; the answer must match one choice."
      : "Do not include a choices field.";

  const modelId = resolveModelForTier(env, params.tier);
  const googleModelId = resolveGoogleModelId(modelId);

  const promptLines = [
    `Generate exactly ${params.count} flashcard Q&A pairs from the source material.`,
    "Use the same language as the source for questions and answers.",
    "Return a JSON object with an items array; each item has question and answer fields.",
    kindInstruction,
  ];

  if (params.text) {
    promptLines.push("", "Source text:", params.text);
  } else {
    promptLines.push("", "Source material is provided as image(s). Read them carefully.");
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: Uint8Array; mimeType?: string }
  > = [{ type: "text", text: promptLines.join("\n") }];

  for (const image of params.images ?? []) {
    content.push({ type: "image", image: image.data, mimeType: image.mime });
  }

  const { object } = await generateObject({
    model: createObjectModelForId(env, modelId),
    schema: zodSchema(qaGenerateSchema),
    ...(googleModelId
      ? { providerOptions: { google: { structuredOutputs: true } } }
      : {}),
    messages: [{ role: "user", content }],
  });

  return { items: object.items };
}

export async function generateQaItems(
  env: Env,
  params: { text: string; count: number; kind: "qa" | "choice" },
): Promise<{ items: QaGenerateItem[] }> {
  return generateCardsFromSource(env, {
    text: params.text,
    count: params.count,
    kind: params.kind,
    tier: "fast",
  });
}

export function createAskResponseStream(
  env: Env,
  params: { cardContext: string; question: string },
): Response {
  if (!isAiConfigured(env)) {
    throw new AiUnavailableError();
  }

  const result = streamText({
    model: createChatModel(env),
    system:
      "You are a helpful tutor for flashcard study. Answer concisely in Japanese unless the card content is in another language. Ground answers in the provided card context.",
    prompt: `Card context:\n${params.cardContext}\n\nStudent question:\n${params.question}`,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const code = mapAiCallError(error);
        console.error("ask stream failed", error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: code })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
