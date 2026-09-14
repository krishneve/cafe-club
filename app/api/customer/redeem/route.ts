import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-redeem"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { rewardId } = z.object({ rewardId: z.string().min(1).max(100) }).parse(await req.json());
    const cafeId = s.session.cafeId!;
    const r = await db.reward.findFirst({ where: { id: rewardId, cafeId, active: true } });
    if (!r) return NextResponse.json({ error: "Reward unavailable." }, { status: 404 });
    if (r.membersOnly) {
      const m = await db.membership.findUnique({ where: { cafeId_customerId: { cafeId, customerId: s.customer.id } } });
      const active = m?.status === "ACTIVE" && (!m.expiresAt || m.expiresAt > new Date());
      if (!active) return NextResponse.json({ error: "This reward is reserved for active members." }, { status: 403 });
    }
    const result = await db.$transaction(async (tx) => {
      const c = await tx.customer.findFirst({ where: { id: s.customer.id, cafeId } });
      if (!c || c.pointsBalance < r.pointsCost) return null;
      await tx.customer.update({ where: { id: c.id }, data: { pointsBalance: { decrement: r.pointsCost } } });
      if (r.stock !== null) {
        const updatedReward = await tx.reward.updateMany({ where: { id: r.id, cafeId, active: true, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
        if (updatedReward.count !== 1) throw new Error("OUT_OF_STOCK");
      }
      await tx.redemption.create({ data: { cafeId, customerId: c.id, rewardId: r.id, pointsSpent: r.pointsCost, expiresAt: new Date(Date.now() + 30 * 86400000) } });
      await tx.loyaltyActivity.create({ data: { cafeId, customerId: c.id, type: "REWARD_REDEEMED", title: `Redeemed ${r.title}`, description: `${r.pointsCost} points spent`, points: -r.pointsCost, stamps: 0, metadataJson: JSON.stringify({ rewardId: r.id }) } });
      return true;
    });
    if (!result) return NextResponse.json({ error: "Not enough points." }, { status: 400 });
    return NextResponse.json({ message: `🎉 ${r.title} redeemed!` });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid reward." }, { status: 400 });
    console.error("redeem", error);
    return NextResponse.json({ error: "Unable to redeem reward." }, { status: 500 });
  }
}
