import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { assertSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const s = await requireOwner();
    if (s.user.role !== "CAFE_ADMIN" || !s.user.cafeId) return NextResponse.json({ error: "Only café owners can manage billing." }, { status: 403 });
    const sub = await db.subscription.findUnique({ where: { cafeId: s.user.cafeId } });
    if (!sub?.stripeCustomerId) return NextResponse.json({ error: "No Stripe customer is linked yet. Start a subscription first." }, { status: 400 });
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: appUrl("/admin/billing") });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("billing portal", e);
    return NextResponse.json({ error: "Unable to open billing portal." }, { status: 500 });
  }
}
