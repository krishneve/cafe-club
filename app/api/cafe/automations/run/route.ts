import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { runCafeAutomation, type AutomationKey } from "@/lib/automation";

const schema = z.object({ key: z.enum(["BIRTHDAY", "WIN_BACK_30", "FIRST_ORDER", "REWARD_READY"]) });

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "automation-run"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const session = await requirePermission("AUTOMATIONS");
    const body = schema.parse(await req.json());
    const result = await runCafeAutomation(session.user.cafeId!, body.key as AutomationKey);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid automation." }, { status: 400 });
    console.error("automation-run", e);
    return NextResponse.json({ error: "Unable to run automation." }, { status: 500 });
  }
}
