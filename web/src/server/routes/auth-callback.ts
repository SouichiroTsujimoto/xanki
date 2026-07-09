import { Hono } from "hono";
import { createAuth } from "../auth";
import type { Env } from "../env";

const DESKTOP_CALLBACK_ERROR_HTML = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>xanki</title></head>
<body>
  <p>ログインに失敗しました。ブラウザを閉じて、xanki アプリから再度 Google ログインを試してください。</p>
</body>
</html>`;

const DESKTOP_CALLBACK_SUCCESS_HTML = (redirectTarget: string) => `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>xanki</title>
  <meta http-equiv="refresh" content="0;url=${redirectTarget}">
</head>
<body>
  <p>ログインしました。xanki アプリに戻ります…</p>
  <p><a href="${redirectTarget}">アプリに戻る</a></p>
  <script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
</body>
</html>`;

function isLoopbackReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      parsed.pathname === "/callback"
    );
  } catch {
    return false;
  }
}

function buildDeepLinkCallback(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `xanki://auth/callback?${params.toString()}`;
}

function buildCanonicalAuthUrl(requestUrl: string, appUrl: string): string | null {
  try {
    const request = new URL(requestUrl);
    const canonical = new URL(appUrl);
    if (request.origin === canonical.origin) {
      return null;
    }
    return new URL(`${request.pathname}${request.search}`, canonical.origin).toString();
  } catch {
    return null;
  }
}

export const authCallbackRoutes = new Hono<{ Bindings: Env }>();

authCallbackRoutes.get("/desktop-sign-in", async (c) => {
  const canonicalUrl = buildCanonicalAuthUrl(c.req.url, c.env.APP_URL);
  if (canonicalUrl) {
    return c.redirect(canonicalUrl, 302);
  }

  const returnParam = c.req.query("return");
  const returnUrl =
    returnParam && isLoopbackReturnUrl(returnParam) ? returnParam : null;
  const callbackURL = returnUrl
    ? `${new URL("/auth/desktop-callback", c.req.url).origin}/auth/desktop-callback?return=${encodeURIComponent(returnUrl)}`
    : new URL("/auth/desktop-callback", c.req.url).toString();

  const auth = createAuth(c.env);
  let signInResponse: Response;
  try {
    signInResponse = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL,
      },
      headers: c.req.raw.headers,
      asResponse: true,
    });
  } catch {
    return c.text("ログイン開始に失敗しました", 500);
  }

  if (!signInResponse.ok) {
    return c.text("ログイン開始に失敗しました", 500);
  }

  const data = (await signInResponse.json()) as { url?: string };
  const googleUrl = data.url ?? signInResponse.headers.get("Location");
  if (!googleUrl) {
    return c.text("OAuth URL を取得できませんでした", 500);
  }

  const res = c.redirect(googleUrl, 302);
  const setCookies =
    typeof signInResponse.headers.getSetCookie === "function"
      ? signInResponse.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    res.headers.append("Set-Cookie", cookie);
  }
  return res;
});

authCallbackRoutes.get("/desktop-callback", async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const token = session?.session?.token;

  const returnParam = c.req.query("return");
  const returnUrl =
    returnParam && isLoopbackReturnUrl(returnParam) ? returnParam : null;

  if (!token) {
    if (returnUrl) {
      return c.html(DESKTOP_CALLBACK_ERROR_HTML, 401);
    }
    // ASWebAuthenticationSession は HTML 401 を拾えずキャンセル扱いになる。深リンクで error を返す。
    return c.redirect(buildDeepLinkCallback({ error: "session_missing" }), 302);
  }

  if (returnUrl) {
    // Top-level 302 — JS redirect だと Chrome の Local Network Access で
    // localhost → 127.0.0.1 へ届かず chrome-error になることがある
    return c.redirect(`${returnUrl}?token=${encodeURIComponent(token)}`, 302);
  }
  const redirectTarget = buildDeepLinkCallback({ token });
  // iOS ASWebAuthenticationSession は HTTP 302 の xanki:// のみ拾う。
  // Accept: text/html でも HTML/JS リダイレクトは拾えないため、深リンクは常に 302。
  // 外部ブラウザ向け HTML フォールバックが必要なら ?format=html を明示する。
  if (c.req.query("format") === "html") {
    return c.html(DESKTOP_CALLBACK_SUCCESS_HTML(redirectTarget));
  }
  return c.redirect(redirectTarget, 302);
});
