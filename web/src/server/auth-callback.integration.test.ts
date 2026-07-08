import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { createTestUserSession } from "./test-auth";

describe("desktop auth callback", () => {
  it("302-redirects loopback with bearer token when session is present", async () => {
    const { token } = await createTestUserSession(env);
    const auth = createAuth(env);
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });
    expect(session?.session?.token).toBe(token);

    const res = await SELF.fetch(
      "http://localhost/auth/desktop-callback?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback",
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `http://localhost:54321/callback?token=${encodeURIComponent(token)}`,
    );
  });

  it("starts desktop sign-in with Google redirect", async () => {
    const res = await SELF.fetch(
      "http://localhost/auth/desktop-sign-in?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback",
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("Location") ?? "";
    expect(location).toContain("accounts.google.com");
    expect(res.headers.get("set-cookie")).toContain("better-auth.state");
  });
});
