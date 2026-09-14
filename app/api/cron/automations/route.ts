import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { runAllAutomations } from "@/lib/automation";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const valid = !!secret && supplied.length === secret.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = new Date();
  await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.otp.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.webhookEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * 86400000) }, status: { in: ["PROCESSED", "FAILED"] } } }),
  ]);
  await db.subscription.updateMany({ where: { status: "TRIALING", currentPeriodEnd: { lte: now } }, data: { status: "EXPIRED" } });
  await db.membership.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
  const cafes = await db.cafe.findMany({ where: { subscription: { status: { in: ["TRIALING", "ACTIVE"] } } }, select: { id: true } });
  const results = [];
  for (const cafe of cafes) {
    try { results.push({ cafeId: cafe.id, results: await runAllAutomations(cafe.id) }); }
    catch (error) { results.push({ cafeId: cafe.id, error: error instanceof Error ? error.message : "Automation failed" }); }
  }
  return NextResponse.json({ cafes: cafes.length, results });
}
