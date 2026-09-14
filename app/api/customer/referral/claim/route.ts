import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";

const schema = z.object({ code: z.string().trim().min(3).max(40) });

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-referral"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { code } = schema.parse(await req.json());
    const cafeId = s.session.cafeId!;
    const referrer = await db.customer.findFirst({ where: { cafeId, referralCode: code.toUpperCase() } });
    if (!referrer) return NextResponse.json({ error: "That referral code is not valid for this café." }, { status: 404 });
    if (referrer.id === s.customer.id) return NextResponse.json({ error: "You cannot use your own referral code." }, { status: 400 });
    const existing = await db.referral.findFirst({ where: { cafeId, referredId: s.customer.id } });
    if (existing) return NextResponse.json({ error: "You already have a referral attached to your account." }, { status: 409 });
    const feature = await db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "REFERRAL" } } });
    if (!feature?.enabled) return NextResponse.json({ error: "Referrals are currently unavailable." }, { status: 400 });
    const cfg = JSON.parse(feature.configJson || "{}");
    const rewardPoints = Math.max(0, Number(cfg.rewardPoints || 100));
    await db.referral.create({ data: { cafeId, referrerId: referrer.id, referredId: s.customer.id, code: referrer.referralCode, rewardPoints, status: "PENDING" } });
    return NextResponse.json({ message: `Referral attached. Complete your first qualifying order to unlock ${rewardPoints} points for your friend.` });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid referral code." }, { status: 400 });
    console.error("referral claim", e);
    return NextResponse.json({ error: "Unable to attach referral." }, { status: 500 });
  }
}
