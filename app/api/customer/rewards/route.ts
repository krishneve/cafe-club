import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET() {
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const cafeId = s.session.cafeId!;
  const membership = await db.membership.findUnique({ where: { cafeId_customerId: { cafeId, customerId: s.customer.id } } });
  const member = membership?.status === "ACTIVE" && (!membership.expiresAt || membership.expiresAt > new Date());
  const rewards = await db.reward.findMany({ where: { cafeId, active: true, ...(member ? {} : { membersOnly: false }) }, orderBy: { pointsCost: "asc" } });
  return NextResponse.json(rewards);
}
