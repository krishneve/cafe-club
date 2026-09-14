import crypto from "crypto";
import { NextResponse } from "next/server";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BODY_BYTES = 256 * 1024;

export function clientKey(req: Request, suffix = "global") {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return `${suffix}:${ip}`;
}

export async function rateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS) {
  if (process.env.NODE_ENV === "production") {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return { ok: false, retryAfter: 60 };
    try {
      const encodedKey = encodeURIComponent(`cafeclub:rl:${key}`);
      const response = await fetch(`${url}/incr/${encodedKey}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return { ok: false, retryAfter: 60 };
      const payload = await response.json() as { result?: number };
      const count = Number(payload.result || 0);
      if (count === 1) {
        const expire = await fetch(`${url}/pexpire/${encodedKey}/${Math.max(1000, Math.ceil(windowMs))}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!expire.ok) return { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
      }
      return { ok: count <= max, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
    } catch {
      // Fail closed in production if the distributed limiter is unavailable.
      return { ok: false, retryAfter: 60 };
    }
  }

  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  current.count += 1;
  return { ok: current.count <= max, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
}
export function rateLimitResponse(retryAfter: number, message = "Too many requests. Try again later.") {
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const expected = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!expected) return true;
  try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}

export function assertJsonBody(req: Request) {
  const length = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return false;
  const type = req.headers.get("content-type");
  return !type || type.toLowerCase().includes("application/json");
}

export function securityError(message = "Request blocked.") { return NextResponse.json({ error: message }, { status: 403 }); }
export function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export function safeJson<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }
export function hashIdentifier(value: string) { return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16); }
