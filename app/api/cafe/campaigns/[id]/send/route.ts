import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { sendCampaign } from "@/lib/campaigns";

const schema = z.object({ segment: z.enum(["ALL","VIP","INACTIVE_30","NEW_30","BIRTHDAY_7","POINTS_500"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "campaign-send"), 5, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const s = await requirePermission("CAMPAIGNS");
    const b = schema.parse(await req.json());
    const { id } = await params;
    const result = await sendCampaign(id, s.user.cafeId!, b.segment);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid audience." }, { status: 400 });
    if (e instanceof Error && e.message === "FORBIDDEN") return NextResponse.json({ error: "You don't have permission to send campaigns." }, { status: 403 });
    console.error("campaign-send", e);
    return NextResponse.json({ error: "Unable to send campaign." }, { status: 500 });
  }
}
