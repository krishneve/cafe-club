import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {assertSameOrigin, jsonError, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";

const schema = z.object({
  category: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.number().positive().max(100000),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const s = await requirePermission("POS");
    if (!s.user.cafeId) return jsonError("No café assigned.", 400);
    return NextResponse.json(await db.menuItem.findMany({ where: { cafeId: s.user.cafeId }, orderBy: [{ category: "asc" }, { name: "asc" }] }));
  } catch { return jsonError("Unauthorized.", 401); }
}

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "menu-write"), 30, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return jsonError("Invalid request origin.", 403);
  try {
    const s = await requirePermission("MENU");
    if (!s.user.cafeId) return jsonError("No café assigned.", 400);
    const body = schema.parse(await req.json());
    const item = await db.menuItem.create({ data: { ...body, description: body.description || null, cafeId: s.user.cafeId } });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message || "Invalid menu item.", 400);
    return jsonError("Unable to create menu item.", 500);
  }
}
