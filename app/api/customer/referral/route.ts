import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET() {
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const [sent, received] = await Promise.all([
    db.referral.findMany({ where: { cafeId: s.session.cafeId!, referrerId: s.customer.id }, select: { id: true, status: true, referred: { select: { name: true, email: true } }, rewardPoints: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.referral.findFirst({ where: { cafeId: s.session.cafeId!, referredId: s.customer.id }, select: { status: true, rewardPoints: true, referrer: { select: { name: true, email: true } } } })
  ]);
  return NextResponse.json({ customer: { name: s.customer.name, referralCode: s.customer.referralCode }, sent, received });
}
