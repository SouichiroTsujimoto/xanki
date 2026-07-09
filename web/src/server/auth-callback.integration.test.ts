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

  it("302-redirects xanki deep link when no return param", async () => {
    const { token } = await createTestUserSession(env);
    const res = await SELF.fetch("http://localhost/auth/desktop-callback", {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `xanki://auth/callback?token=${encodeURIComponent(token)}`,
    );
  });

  it("302-redirects xanki deep link even when Accept includes text/html", async () => {
    const { token } = await createTestUserSession(env);
    const res = await SELF.fetch("http://localhost/auth/desktop-callback", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `xanki://auth/callback?token=${encodeURIComponent(token)}`,
    );
  });

  it("returns HTML deep-link fallback only when format=html", async () => {
    const { token } = await createTestUserSession(env);
    const res = await SELF.fetch(
      "http://localhost/auth/desktop-callback?format=html",
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
      },
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("xanki://auth/callback?token=");
    expect(body).toContain(encodeURIComponent(token));
  });

  it("302-redirects xanki deep link error when session cookie is missing", async () => {
    const res = await SELF.fetch("http://localhost/auth/desktop-callback", {
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "xanki://auth/callback?error=session_missing",
    );
  });

  it("returns HTML for loopback desktop callback errors", async () => {
    const res = await SELF.fetch(
      "http://localhost/auth/desktop-callback?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback",
      { redirect: "manual" },
    );

    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("starts desktop sign-in with Google redirect", async () => {
    const res = await SELF.fetch(
      `${env.APP_URL}/auth/desktop-sign-in?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("Location") ?? "";
    expect(location).toContain("accounts.google.com");
    expect(res.headers.get("set-cookie")).toContain("better-auth.state");
  });

  it("canonicalizes desktop sign-in before starting OAuth", async () => {
    const res = await SELF.fetch(
      "http://127.0.0.1/auth/desktop-sign-in?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback",
      { redirect: "manual" },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `${env.APP_URL}/auth/desktop-sign-in?return=http%3A%2F%2Flocalhost%3A54321%2Fcallback`,
    );
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
