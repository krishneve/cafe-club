import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { login } from "@/lib/auth";
import { assertSameOrigin, clientKey, rateLimit, assertJsonBody, rateLimitResponse } from "@/lib/security";

const schema = z.object({ email: z.string().email().max(254), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i), otp: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limit = await rateLimit(clientKey(req, "otp-verify"), 15, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const b = schema.parse(await req.json());
    const email = b.email.toLowerCase();
    const c = await db.cafe.findUnique({ where: { slug: b.slug }, include: { subscription: true } });
    if (!c) return NextResponse.json({ error: "Café not found." }, { status: 404 });
    if (c.subscription && ["CANCELED", "EXPIRED"].includes(c.subscription.status)) return NextResponse.json({ error: "This café subscription is inactive." }, { status: 403 });
    if (!(await verifyOtp(email, c.id, b.otp))) return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 401 });

    const sa = await db.user.findFirst({ where: { email, role: "SUPER_ADMIN" } });
    if (sa) { await login(sa.id); return NextResponse.json({ redirect: "/admin" }); }

    const owner = await db.user.findFirst({ where: { email, cafeId: c.id, role: "CAFE_ADMIN" } });
    if (owner) { await login(owner.id, c.id); return NextResponse.json({ redirect: "/admin" }); }
    const staff = await db.user.findFirst({ where: { email, cafeId: c.id, role: "STAFF" } });
    if (staff) { await login(staff.id, c.id); return NextResponse.json({ redirect: "/admin/pos" }); }

    let cu = await db.customer.findUnique({ where: { cafeId_email: { cafeId: c.id, email } } });
    if (!cu) cu = await db.customer.create({ data: { cafeId: c.id, email, referralCode: `${c.slug.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` } });
    let u = await db.user.findFirst({ where: { email: cu.email, cafeId: c.id, role: "CUSTOMER" } });
    if (!u) u = await db.user.create({ data: { email: cu.email, cafeId: c.id, role: "CUSTOMER", name: cu.name } });
    await login(u.id, c.id, cu.id);
    return NextResponse.json({ redirect: `/c/${c.slug}` });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
    console.error("verify-otp", error);
    return NextResponse.json({ error: "Unable to complete login." }, { status: 500 });
  }
}
