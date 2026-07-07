import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";

describe("better-auth email OTP", () => {
  it("captures OTP via testUtils and signs in with bearer token", async () => {
    const auth = createAuth(env);
    const ctx = await auth.$context;
    const email = `auth-test-${Date.now()}@xanki.local`;

    await auth.api.sendVerificationOTP({
      body: { email, type: "sign-in" },
    });

    const otp = ctx.test.getOTP(email);
    expect(otp).toMatch(/^\d{6}$/);

    const res = await auth.api.signInEmailOTP({
      body: { email, otp: otp! },
      asResponse: true,
    });
    expect(res.ok).toBe(true);
    expect(res.headers.get("set-auth-token")).toBeTruthy();
  });
});
