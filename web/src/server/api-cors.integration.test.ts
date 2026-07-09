import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("api cors", () => {
  it("allows iOS simulator preflight requests with authorization", async () => {
    const res = await SELF.fetch("http://localhost/api/me", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("authorization");
  });

  it("allows private network preflight requests when requested", async () => {
    const res = await SELF.fetch("http://localhost/api/me", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
        "Access-Control-Request-Private-Network": "true",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
  });

  it("allows Capacitor preflight requests with authorization", async () => {
    const res = await SELF.fetch("http://localhost/api/me", {
      method: "OPTIONS",
      headers: {
        Origin: "capacitor://localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("authorization");
  });

  it("allows Capacitor API responses", async () => {
    const res = await SELF.fetch("http://localhost/api/me", {
      headers: {
        Origin: "capacitor://localhost",
        Authorization: "Bearer invalid",
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
  });
});
