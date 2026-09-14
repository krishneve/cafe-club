import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });
export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-feedback"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const s = await customerSession();
  if (!s) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const b = schema.parse(await req.json());
    await db.feedback.create({ data: { cafeId: s.session.cafeId!, customerId: s.customer.id, rating: b.rating, comment: b.comment || "" } });
    return NextResponse.json({ message: b.rating >= 4 ? "Thanks! We hope to see you again." : "Thanks for the honest feedback — the café team can use it to improve." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });
    console.error("feedback", error);
    return NextResponse.json({ error: "Unable to save feedback." }, { status: 500 });
  }
}
