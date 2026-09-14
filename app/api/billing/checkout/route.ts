import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { assertSameOrigin } from "@/lib/security";

const schema = z.object({ planId: z.string().cuid() });

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const s = await requireOwner();
    if (s.user.role !== "CAFE_ADMIN" || !s.user.cafeId) return NextResponse.json({ error: "Only café owners can change billing." }, { status: 403 });
    const body = schema.parse(await req.json());
    const [cafe, plan] = await Promise.all([
      db.cafe.findUnique({ where: { id: s.user.cafeId } }),
      db.plan.findUnique({ where: { id: body.planId } }),
    ]);
    if (!cafe || !plan || !plan.active) return NextResponse.json({ error: "Plan unavailable." }, { status: 404 });
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to enable live billing." }, { status: 503 });
    if (!plan.stripePriceId) return NextResponse.json({ error: `Stripe price is not configured for the ${plan.name} plan.` }, { status: 503 });

    const existing = await db.subscription.findUnique({ where: { cafeId: cafe.id } });
    if (existing?.stripeSubscriptionId && existing.status === "ACTIVE") {
      return NextResponse.json({ error: "You already have an active subscription. Use Manage billing to change it." }, { status: 409 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: appUrl("/admin/billing?checkout=success"),
      cancel_url: appUrl("/admin/billing?checkout=cancelled"),
      ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : { customer_email: cafe.email }),
      allow_promotion_codes: true,
      metadata: { cafeId: cafe.id, planId: plan.id },
      subscription_data: { metadata: { cafeId: cafe.id, planId: plan.id } },
    });

    await db.subscription.upsert({
      where: { cafeId: cafe.id },
      create: { cafeId: cafe.id, planId: plan.id, status: "TRIALING", stripeCheckoutSessionId: session.id },
      update: { planId: plan.id, stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    console.error("billing checkout", e);
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
