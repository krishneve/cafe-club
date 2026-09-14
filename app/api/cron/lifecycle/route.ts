import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { syncMembershipLifecycle } from "@/lib/lifecycle";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const valid = !!expected && supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const cafes = await db.cafe.findMany({ where: { subscription: { status: { in: ["TRIALING", "ACTIVE"] } } }, select: { id: true } });
  const results = [] as unknown[];
  for (const cafe of cafes) results.push({ cafeId: cafe.id, ...(await syncMembershipLifecycle(cafe.id)) });
  return NextResponse.json({ ok: true, results });
}
