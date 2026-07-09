import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeHttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  bodyBase64?: string;
  responseType?: "text" | "base64";
}

interface NativeHttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string;
  bodyBase64?: string;
}

const NativeHttp = registerPlugin<{
  request(options: NativeHttpRequestOptions): Promise<NativeHttpResponse>;
}>("NativeHttp");

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  new Headers(headers).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function responseHeaders(headers: Record<string, string> | undefined): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers ?? {})) {
    out.set(key, value);
  }
  return out;
}

async function bodyToNative(init?: RequestInit): Promise<Pick<NativeHttpRequestOptions, "body" | "bodyBase64">> {
  const body = init?.body;
  if (body === undefined || body === null) return {};
  if (typeof body === "string") return { body };
  if (body instanceof ArrayBuffer) {
    const bytes = new Uint8Array(body);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { bodyBase64: btoa(binary) };
  }
  throw new Error("native_http_body_unsupported");
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export async function mobileFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!Capacitor.isNativePlatform()) {
    return fetch(input, init);
  }

  const res = await NativeHttp.request({
    url: requestUrl(input),
    method: init?.method ?? "GET",
    headers: headersToRecord(init?.headers),
    ...(await bodyToNative(init)),
  });

  return new Response(res.body ?? "", {
    status: res.status,
    headers: responseHeaders(res.headers),
  });
}

export async function mobileFetchBlob(
  url: string,
  headers: Record<string, string>,
): Promise<Blob> {
  if (!Capacitor.isNativePlatform()) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("blob_fetch_failed");
    return res.blob();
  }

  const res = await NativeHttp.request({
    url,
    method: "GET",
    headers,
    responseType: "base64",
  });
  if (res.status < 200 || res.status >= 300 || !res.bodyBase64) {
    throw new Error("blob_fetch_failed");
  }

  const binary = atob(res.bodyBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes]);
}
