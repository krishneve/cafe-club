import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { assertSameOrigin, jsonError, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";

const patchSchema = z.object({
  category: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  price: z.number().positive().max(100000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "menu-write"), 30, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return jsonError("Invalid request origin.", 403);
  try {
    const s = await requirePermission("MENU");
    if (!s.user.cafeId) return jsonError("No café assigned.", 400);
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const existing = await db.menuItem.findFirst({ where: { id, cafeId: s.user.cafeId } });
    if (!existing) return jsonError("Menu item not found.", 404);
    const item = await db.menuItem.update({ where: { id }, data: body });
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message || "Invalid menu item.", 400);
    return jsonError("Unable to update menu item.", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit(clientKey(req, "menu-delete"), 20, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return jsonError("Invalid request origin.", 403);
  try {
    const s = await requirePermission("MENU");
    if (!s.user.cafeId) return jsonError("No café assigned.", 400);
    const { id } = await params;
    const existing = await db.menuItem.findFirst({ where: { id, cafeId: s.user.cafeId } });
    if (!existing) return jsonError("Menu item not found.", 404);
    await db.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return jsonError("Unable to delete menu item.", 500); }
}
