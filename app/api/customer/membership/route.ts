import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";
import { membershipExpiry, syncMembership } from "@/lib/membership";

export async function GET() {
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const membership = await syncMembership(s.session.cafeId!, s.customer.id);
  const config = await db.membershipConfig.findUnique({ where: { cafeId: s.session.cafeId! } });
  return NextResponse.json({ membership, config });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = z.object({ action: z.enum(["JOIN", "CANCEL"]) }).parse(await req.json());
    const { action } = body;
    const config = await db.membershipConfig.findUnique({ where: { cafeId: s.session.cafeId! } });
    if (!config?.active) return NextResponse.json({ error: "Membership is unavailable." }, { status: 404 });
    const existing = await syncMembership(s.session.cafeId!, s.customer.id);
    if (action === "CANCEL") {
      if (!existing || existing.status !== "ACTIVE") return NextResponse.json({ error: "No active membership to cancel." }, { status: 400 });
      await db.membership.update({ where: { id: existing.id }, data: { status: "CANCELED" } });
      return NextResponse.json({ message: "Membership canceled." });
    }
    if (existing?.status === "ACTIVE") return NextResponse.json({ error: "You already have an active membership." }, { status: 409 });
    if (existing?.status === "PENDING") return NextResponse.json({ error: "Your membership payment is already pending." }, { status: 409 });
    const price = Number(config.price || 0);
    const now = new Date();
    if (price <= 0) {
      const membership = await db.membership.upsert({ where: { cafeId_customerId: { cafeId: s.session.cafeId!, customerId: s.customer.id } }, create: { cafeId: s.session.cafeId!, customerId: s.customer.id, status: "ACTIVE", startedAt: now, expiresAt: membershipExpiry(now, config.durationDays), pricePaid: 0 }, update: { status: "ACTIVE", startedAt: now, expiresAt: membershipExpiry(now, config.durationDays), pricePaid: 0 } });
      return NextResponse.json({ message: "Membership activated.", membership });
    }
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Online membership payment is not configured yet." }, { status: 503 });
    const cafe = await db.cafe.findUnique({ where: { id: s.session.cafeId! } });
    if (!cafe) return NextResponse.json({ error: "Café not found." }, { status: 404 });
    const membership = await db.membership.upsert({ where: { cafeId_customerId: { cafeId: cafe.id, customerId: s.customer.id } }, create: { cafeId: cafe.id, customerId: s.customer.id, status: "PENDING", pricePaid: price }, update: { status: "PENDING", pricePaid: price } });
    const checkout = await stripe.checkout.sessions.create({ mode: "payment", line_items: [{ price_data: { currency: process.env.STRIPE_CURRENCY || "inr", product_data: { name: config.name }, unit_amount: Math.round(price * 100) }, quantity: 1 }], customer_email: s.customer.email, success_url: appUrl(`/c/${cafe.slug}/membership?membership=success`), cancel_url: appUrl(`/c/${cafe.slug}/membership?membership=cancelled`), metadata: { membershipId: membership.id, membershipPurchase: "true", cafeId: cafe.id, customerId: s.customer.id } });
    await db.membership.update({ where: { id: membership.id }, data: { stripeCheckoutSessionId: checkout.id } });
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid membership action." }, { status: 400 });
    console.error("membership", e); return NextResponse.json({ error: "Unable to update membership." }, { status: 500 });
  }
}
