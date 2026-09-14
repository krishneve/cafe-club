import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, safeJson, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-scratch"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const cafeId = s.session.cafeId!;
  const f = await db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "SCRATCH_CARD" } } });
  if (!f?.enabled) return NextResponse.json({ error: "Scratch cards are disabled." }, { status: 400 });
  const c = safeJson<{ winRate?: number; winPoints?: number }>(f.configJson, {});
  const day = new Date().toISOString().slice(0, 10);
  const won = Math.random() * 100 < Number(c.winRate || 70);
  const points = Math.max(0, Number(c.winPoints || 50));
  try {
    await db.$transaction(async tx => {
      await tx.gamePlay.create({ data: { cafeId, customerId: s.customer.id, feature: "SCRATCH_CARD", playDate: day } });
      if (won) {
        await tx.customer.update({ where: { id: s.customer.id }, data: { pointsBalance: { increment: points } } });
        await tx.loyaltyActivity.create({ data: { cafeId, customerId: s.customer.id, type: "GAME_WIN", title: "Scratch card bonus", description: `Won ${points} bonus points`, points, stamps: 0, metadataJson: JSON.stringify({ feature: "SCRATCH_CARD", playDate: day }) } });
      }
    });
  } catch { return NextResponse.json({ error: "You've already used today's scratch card." }, { status: 429 }); }
  return NextResponse.json({ message: won ? `🎉 You won ${points} bonus points!` : "☕ Almost! Try again tomorrow." });
}
