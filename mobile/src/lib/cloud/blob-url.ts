import { CLOUD_UNAUTHORIZED } from "@xanki/shared";
import { CLOUD_URL, getSessionToken } from "./session";

const blobUrlCache = new Map<string, string>();

function extractBlobHash(imagePath: string): string {
  const match = imagePath.match(/([a-f0-9]{64})/i);
  if (!match) {
    throw new Error("invalid_image_path");
  }
  return match[1];
}

export async function resolveAuthenticatedBlobUrl(imagePath: string): Promise<string> {
  const hash = extractBlobHash(imagePath);
  const cached = blobUrlCache.get(hash);
  if (cached) {
    return cached;
  }

  const token = await getSessionToken();
  if (!token) {
    throw new Error(CLOUD_UNAUTHORIZED);
  }

  const res = await fetch(`${CLOUD_URL}/api/blobs/${hash}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("blob_fetch_failed");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  blobUrlCache.set(hash, objectUrl);
  return objectUrl;
}

export function clearAuthenticatedBlobUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}
