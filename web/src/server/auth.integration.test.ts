import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { createTestUserSession } from "./test-auth";

describe("better-auth session", () => {
  it("accepts bearer token for /api/me", async () => {
    const { token, email } = await createTestUserSession(env);
    const auth = createAuth(env);
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });
    expect(session?.user?.email).toBe(email);

    const res = await SELF.fetch("http://localhost/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { email: string };
    expect(body.email).toBe(email);
  });
});
