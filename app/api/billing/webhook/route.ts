import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("stripe signature", e);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let webhook = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: "stripe", eventId: event.id } } });
  if (webhook?.status === "PROCESSED") return NextResponse.json({ received: true, duplicate: true });
  if (!webhook) {
    webhook = await db.webhookEvent.create({ data: { provider: "stripe", eventId: event.id, type: event.type, status: "PROCESSING" } });
  } else {
    webhook = await db.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSING", error: null } });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const cafeId = checkout.metadata?.cafeId;
        const planId = checkout.metadata?.planId;
        const membershipId = checkout.metadata?.membershipId;
        const membershipPurchase = checkout.metadata?.membershipPurchase === "true";
        const subscriptionId = typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id;
        const customerId = typeof checkout.customer === "string" ? checkout.customer : checkout.customer?.id;
        if (membershipPurchase && membershipId && cafeId) {
          const membership = await db.membership.findUnique({ where: { id: membershipId }, include: { cafe: { include: { membership: true } } } });
          if (membership?.cafe.membership) {
            const startedAt = new Date();
            const expiresAt = new Date(startedAt.getTime() + Math.max(1, membership.cafe.membership.durationDays) * 86400000);
            await db.membership.update({ where: { id: membershipId }, data: { status: "ACTIVE", startedAt, expiresAt, stripeCheckoutSessionId: checkout.id } });
          }
        } else if (cafeId && planId) {
          await db.subscription.update({ where: { cafeId }, data: { planId, status: "ACTIVE", stripeCustomerId: customerId || undefined, stripeSubscriptionId: subscriptionId || undefined, stripeCheckoutSessionId: checkout.id, cancelAtPeriodEnd: false } });
          await db.cafe.update({ where: { id: cafeId }, data: { planId } });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const cafeId = sub.metadata?.cafeId;
        const planId = sub.metadata?.planId;
        if (cafeId) {
          const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "TRIALING"> = { active: "ACTIVE", trialing: "TRIALING", past_due: "PAST_DUE", canceled: "CANCELED", unpaid: "PAST_DUE", incomplete: "PAST_DUE", incomplete_expired: "EXPIRED" };
          const status = statusMap[sub.status] || "PAST_DUE";
          await db.subscription.update({ where: { cafeId }, data: { ...(planId ? { planId } : {}), status, stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id, stripeSubscriptionId: sub.id, cancelAtPeriodEnd: sub.cancel_at_period_end, currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined } });
          if (planId) await db.cafe.update({ where: { id: cafeId }, data: { planId } });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cafeId = sub.metadata?.cafeId;
        if (cafeId) await db.subscription.update({ where: { cafeId }, data: { status: "CANCELED", stripeSubscriptionId: sub.id, cancelAtPeriodEnd: false } });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (subscriptionId) await db.subscription.updateMany({ where: { stripeSubscriptionId: subscriptionId }, data: { status: "PAST_DUE" } });
        break;
      }
    }
    await db.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSED", processedAt: new Date(), error: null } });
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe webhook handler", e);
    await db.webhookEvent.update({ where: { id: webhook.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 500) : "Unknown error" } }).catch(() => undefined);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
