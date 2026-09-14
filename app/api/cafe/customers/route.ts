import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/security";

const querySchema = z.object({ q: z.string().trim().min(1).max(254) });

export async function GET(req: Request) {
  try {
    const s = await requirePermission("CUSTOMERS");
    if (!s.user.cafeId) return jsonError("No café assigned.", 400);
    const q = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const customers = await db.customer.findMany({
      where: {
        cafeId: s.user.cafeId,
        OR: [
          { email: { contains: q.q, mode: "insensitive" } },
          { name: { contains: q.q, mode: "insensitive" } },
          { referralCode: { equals: q.q.toUpperCase() } },
        ],
      },
      select: { id: true, name: true, email: true, pointsBalance: true, stamps: true, visits: true, totalSpend: true },
      orderBy: { lastVisitAt: "desc" },
      take: 8,
    });
    return NextResponse.json(customers);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Enter a name, email or customer code.", 400);
    return jsonError("Unauthorized.", 401);
  }
}
