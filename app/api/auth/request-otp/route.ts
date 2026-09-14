import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOtp } from "@/lib/otp";
import { assertSameOrigin, clientKey, rateLimit, assertJsonBody, rateLimitResponse } from "@/lib/security";

const schema = z.object({ email: z.string().email().max(254), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i) });

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limit = await rateLimit(clientKey(req, "otp"), 8, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const b = schema.parse(await req.json());
    const email = b.email.toLowerCase();
    const c = await db.cafe.findUnique({ where: { slug: b.slug }, include: { subscription: true } });
    if (!c) return NextResponse.json({ error: "Café not found." }, { status: 404 });
    if (c.subscription && ["CANCELED", "EXPIRED"].includes(c.subscription.status)) return NextResponse.json({ error: "This café subscription is inactive." }, { status: 403 });
    await sendOtp(email, c.id);
    return NextResponse.json({ message: "OTP sent. Check your email." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email and café code." }, { status: 400 });
    console.error("request-otp", error);
    return NextResponse.json({ error: "Unable to send OTP right now." }, { status: 500 });
  }
}
