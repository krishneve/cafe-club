import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { audit } from "@/lib/audit";
const schema=z.object({feature:z.enum(["STAMP_CARD","LOYALTY_POINTS","SCRATCH_CARD","SPIN_WHEEL","OFFER","REFERRAL","MEMBERSHIP"]),enabled:z.boolean(),config:z.record(z.unknown()).optional()});
export async function GET(){try{const s=await requirePermission("LOYALTY");return NextResponse.json(await db.cafeFeature.findMany({where:{cafeId:s.user.cafeId!},orderBy:{feature:"asc"}}))}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
export async function PUT(req:Request){
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "settings-write"), 30, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);if(!assertSameOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});try{const s=await requirePermission("LOYALTY");const b=schema.parse(await req.json());if(!s.user.cafeId)return NextResponse.json({error:"No café assigned."},{status:400});const data:any={enabled:b.enabled};if(b.config)data.configJson=JSON.stringify(b.config);const updated=await db.cafeFeature.update({where:{cafeId_feature:{cafeId:s.user.cafeId,feature:b.feature}},data});await audit(s.user.cafeId,s.user.id,"LOYALTY_SETTING_UPDATED","CafeFeature",updated.id,{feature:b.feature,enabled:b.enabled});return NextResponse.json(updated)}catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid loyalty setting."},{status:400});return NextResponse.json({error:"Unable to update setting."},{status:500})}}
