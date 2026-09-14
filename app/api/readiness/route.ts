import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateEnv } from "@/lib/env";

async function rateLimiterReady() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url}/get/cafeclub:readiness`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const production = process.env.NODE_ENV === "production";
  const config = validateEnv({ production });
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const limiter = await rateLimiterReady();
  const ready = config.ok && database && limiter;
  const body = production
    ? { status: ready ? "ready" : "not_ready", checks: { database, configuration: config.ok, rateLimiter: limiter }, timestamp: new Date().toISOString() }
    : { status: ready ? "ready" : "not_ready", checks: { database, configuration: config.ok, rateLimiter: limiter }, configurationErrors: config.errors, timestamp: new Date().toISOString() };

  return NextResponse.json(body, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
