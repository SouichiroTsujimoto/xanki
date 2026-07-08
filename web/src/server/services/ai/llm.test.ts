import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Env } from "../../env";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  streamText: vi.fn(),
  zodSchema: (schema: unknown) => schema,
}));

vi.mock("ai-gateway-provider", () => ({
  createAiGateway: vi.fn(() => (model: unknown) => model),
}));

vi.mock("ai-gateway-provider/providers/unified", () => ({
  unified: (model: string) => `unified:${model}`,
}));

vi.mock("ai-gateway-provider/providers/google", () => ({
  createGoogleGenerativeAI: () => (model: string) => `google:${model}`,
}));

import { generateObject, streamText } from "ai";
import { canUseAi, generateQaItems, isAiAuthError, isAiProviderError, isDevAiBypass, resolveGoogleModelId } from "./llm";

const env = {
  APP_URL: "http://localhost:8787",
  CF_ACCOUNT_ID: "acct",
  AI_GATEWAY_TOKEN: "token",
  AI_GATEWAY_ID: "default",
  AI_MODEL: "google-ai-studio/gemini-2.5-flash",
} as Env;

describe("llm service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bypasses entitlement on localhost", () => {
    expect(isDevAiBypass(env)).toBe(true);
    expect(canUseAi(env, { plan: "free", aiCreditsRemaining: 0 })).toBe(true);
  });

  it("requires pro in production", () => {
    const prod = { ...env, APP_URL: "https://app.example.com" } as Env;
    expect(canUseAi(prod, { plan: "free", aiCreditsRemaining: 0 })).toBe(false);
    expect(canUseAi(prod, { plan: "pro", aiCreditsRemaining: 1 })).toBe(true);
  });

  it("classifies gateway and provider auth errors", () => {
    expect(isAiAuthError({ statusCode: 401, responseBody: "Unauthorized" })).toBe(
      true,
    );
    expect(
      isAiAuthError({ statusCode: 401, responseBody: "Authentication Fails (governor)" }),
    ).toBe(false);
    expect(
      isAiProviderError({ statusCode: 401, responseBody: "Authentication Fails (governor)" }),
    ).toBe(true);
  });

  it("resolves google-ai-studio model ids", () => {
    expect(resolveGoogleModelId("google-ai-studio/gemini-2.5-flash")).toBe(
      "gemini-2.5-flash",
    );
    expect(resolveGoogleModelId("openai/gpt-4.1-mini")).toBeNull();
  });

  it("calls generateObject for qa-generate", async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        items: [{ question: "Q1", answer: "A1" }],
      },
    } as never);

    const result = await generateQaItems(env, {
      text: "biology",
      count: 1,
      kind: "qa",
    });

    expect(result.items).toEqual([{ question: "Q1", answer: "A1" }]);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: { google: { structuredOutputs: true } },
      }),
    );
  });

  it("streams ask text via streamText", async () => {
    async function* textStream() {
      yield "Hello";
      yield " world";
    }

    vi.mocked(streamText).mockReturnValue({
      textStream,
    } as never);

    const { createAskResponseStream } = await import("./llm");
    const response = createAskResponseStream(env, {
      cardContext: "種別: qa",
      question: "詳しく",
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    expect(output).toContain('{"text":"Hello"}');
    expect(output).toContain('{"text":" world"}');
    expect(output).toContain("[DONE]");
  });
});
