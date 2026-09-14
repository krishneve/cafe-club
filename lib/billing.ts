import { db } from "./db";

export const BILLING_PLANS = [
  { name: "Starter", monthlyPrice: 999, maxCustomers: 1000, description: "For cafés starting loyalty", features: ["Points + stamps", "Rewards + referrals", "Up to 1,000 customers"] },
  { name: "Growth", monthlyPrice: 1999, maxCustomers: 5000, description: "For growing cafés", features: ["Everything in Starter", "Campaigns + gamification", "Up to 5,000 customers"] },
  { name: "Pro", monthlyPrice: 3999, maxCustomers: null, description: "For serious retention", features: ["Everything in Growth", "Membership + advanced retention", "Unlimited customers"] },
] as const;

export async function getCafeBilling(cafeId: string) {
  const cafe = await db.cafe.findUnique({ where: { id: cafeId }, include: { subscription: { include: { plan: true } } } });
  if (!cafe) throw new Error("CAFE_NOT_FOUND");
  let subscription = cafe.subscription;
  if (subscription?.status === "TRIALING" && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date()) {
    subscription = await db.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" }, include: { plan: true } });
  }
  return { cafe, subscription };
}

export function appUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
