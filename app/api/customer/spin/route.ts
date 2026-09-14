import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, safeJson, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-spin"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const cafeId = s.session.cafeId!;
  const f = await db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "SPIN_WHEEL" } } });
  if (!f?.enabled) return NextResponse.json({ error: "Spin wheel is disabled." }, { status: 400 });
  const cfg = safeJson<{ dailyLimit?: number }>(f.configJson, {});
  const dailyLimit = Math.max(1, Number(cfg.dailyLimit || 1));
  const day = new Date().toISOString().slice(0, 10);
  const plays = await db.gamePlay.count({ where: { cafeId, customerId: s.customer.id, feature: "SPIN_WHEEL", playDate: day } });
  if (plays >= dailyLimit) return NextResponse.json({ error: "You've reached today's spin limit." }, { status: 429 });
  const wins = ["10 bonus points", "25 bonus points", "Free upgrade", "₹25 off", "Try again"];
  const win = wins[Math.floor(Math.random() * wins.length)];
  const points = win.includes("points") ? Number(win.match(/\d+/)?.[0] || 0) : 0;
  try {
    await db.$transaction(async tx => {
      await tx.gamePlay.create({ data: { cafeId, customerId: s.customer.id, feature: "SPIN_WHEEL", playDate: day } });
      if (points) {
        await tx.customer.update({ where: { id: s.customer.id }, data: { pointsBalance: { increment: points } } });
        await tx.loyaltyActivity.create({ data: { cafeId, customerId: s.customer.id, type: "GAME_WIN", title: "Spin wheel bonus", description: `Won ${points} bonus points`, points, stamps: 0, metadataJson: JSON.stringify({ feature: "SPIN_WHEEL", playDate: day }) } });
      }
    });
  } catch { return NextResponse.json({ error: "You've already used today's spin." }, { status: 429 }); }
  return NextResponse.json({ message: `🎡 You spun: ${win}!` });
}
