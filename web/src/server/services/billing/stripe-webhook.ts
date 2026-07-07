function decodeWebhookSecret(secret: string): Uint8Array {
  if (secret.startsWith("whsec_")) {
    const encoded = secret.slice("whsec_".length);
    const binary = atob(encoded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new TextEncoder().encode(secret);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeWebhookSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<void> {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) {
    throw new Error("invalid_signature");
  }

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    throw new Error("invalid_signature");
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > toleranceSeconds) {
    throw new Error("timestamp_expired");
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
    throw new Error("invalid_signature");
  }
}

/** Integration tests only */
export async function signStripeWebhookPayload(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return `t=${timestamp},v1=${signature}`;
}
