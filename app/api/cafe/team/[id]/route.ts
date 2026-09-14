import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({ staffRole: z.enum(["CASHIER", "MANAGER"]).optional(), active: z.boolean().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "team-update"), 30, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const s = await requirePermission("TEAM");
    if (!s.user.cafeId) return NextResponse.json({ error: "No café." }, { status: 400 });
    const { id } = await params;
    const b = schema.parse(await req.json());
    const u = await db.user.findFirst({ where: { id, cafeId: s.user.cafeId, role: "STAFF" } });
    if (!u) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    if (b.active === false) await db.session.deleteMany({ where: { userId: id } });
    await db.user.update({ where: { id }, data: { staffRole: b.staffRole ?? u.staffRole } });
    await audit(s.user.cafeId, s.user.id, b.active === false ? "STAFF_SIGNED_OUT" : "STAFF_ROLE_UPDATED", "User", id, b);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid staff update." }, { status: 400 });
    return NextResponse.json({ error: e?.message === "FORBIDDEN" ? "Only the café owner can manage the team." : "Unable to update staff." }, { status: e?.message === "FORBIDDEN" ? 403 : 500 });
  }
}
