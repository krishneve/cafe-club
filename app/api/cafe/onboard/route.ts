import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertSameOrigin, clientKey, rateLimit, assertJsonBody, rateLimitResponse } from "@/lib/security";
import { randomBytes } from "crypto";

const schema = z.object({
  ownerName: z.string().trim().min(2).max(100),
  cafeName: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  slug: z.string().trim().min(3).max(60).regex(/^[a-z0-9-]+$/),
  plan: z.enum(["Starter", "Growth", "Pro"]),
});

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limit = await rateLimit(clientKey(req, "onboard"), 5, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
  try {
    const b = schema.parse(await req.json());
    const email = b.email.toLowerCase();
    const existingSlug = await db.cafe.findUnique({ where: { slug: b.slug } });
    if (existingSlug) return NextResponse.json({ error: "That café URL is already taken. Choose another." }, { status: 409 });
    const plan = await db.plan.findUnique({ where: { name: b.plan } });
    if (!plan || !plan.active) return NextResponse.json({ error: "Selected plan is unavailable." }, { status: 400 });
    const existingOwner = await db.user.findFirst({ where: { email, role: "CAFE_ADMIN" } });
    if (existingOwner) return NextResponse.json({ error: "An owner account already exists for this email. Please log in." }, { status: 409 });

    const cafe = await db.$transaction(async tx => {
      const c = await tx.cafe.create({ data: { name: b.cafeName, slug: b.slug, email, phone: b.phone || null, planId: plan.id } });
      await tx.user.create({ data: { email, name: b.ownerName, role: "CAFE_ADMIN", cafeId: c.id } });
      await tx.subscription.create({ data: { cafeId: c.id, planId: plan.id, status: "TRIALING", currentPeriodEnd: new Date(Date.now() + 14 * 86400000) } });
      const configs = [
        ["STAMP_CARD", true, JSON.stringify({ stampsPerOrder: 1, stampsToReward: 8 })],
        ["LOYALTY_POINTS", true, JSON.stringify({ pointsPerRupee: 0.1, minOrder: 50 })],
        ["SCRATCH_CARD", true, JSON.stringify({ winRate: 70, winPoints: 50 })],
        ["SPIN_WHEEL", true, JSON.stringify({ dailyLimit: 1 })],
        ["OFFER", true, "{}"], ["REFERRAL", true, JSON.stringify({ rewardPoints: 100 })], ["MEMBERSHIP", false, "{}"],
      ] as const;
      await tx.cafeFeature.createMany({ data: configs.map(([feature, enabled, configJson]) => ({ cafeId: c.id, feature: feature as any, enabled, configJson })) });
      await tx.membershipConfig.create({ data: { cafeId: c.id, name: `${b.cafeName} Membership`, price: 499, benefitsJson: "[]" } });
      return c;
    });
    return NextResponse.json({ ok: true, slug: cafe.slug, trialDays: 14 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please check the signup details." }, { status: 400 });
    console.error("onboard", e); return NextResponse.json({ error: "Unable to create the café workspace." }, { status: 500 });
  }
}
