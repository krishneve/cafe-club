import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requirePermission("AUTOMATIONS");
    const rows = await db.automationRun.findMany({ where: { cafeId: session.user.cafeId! }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
}
