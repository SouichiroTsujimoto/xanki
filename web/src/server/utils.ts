export function nowMs(): number {
  return Date.now();
}

export function randomId(): string {
  return crypto.randomUUID();
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function otpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function clampUpdatedAt(clientUpdatedAt: number, serverNow: number): number {
  return Math.min(clientUpdatedAt, serverNow + 5 * 60 * 1000);
}

export function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
