import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { audit } from "@/lib/audit";
const schema = z.object({ name:z.string().trim().min(2).max(100), type:z.enum(["WIN_BACK","BIRTHDAY","ANNIVERSARY","BONUS_POINTS","GENERAL"]), message:z.string().trim().min(2).max(1000), bonusPoints:z.number().int().nonnegative().max(100000).optional(), minDaysAway:z.number().int().nonnegative().max(3650).optional(), audience:z.enum(["ALL","VIP","INACTIVE_30","NEW_30","BIRTHDAY_7","POINTS_500"]).default("ALL") });
export async function GET(){try{const s=await requirePermission("CAMPAIGNS");return NextResponse.json(await db.campaign.findMany({where:{cafeId:s.user.cafeId!},orderBy:{createdAt:"desc"}}))}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
export async function POST(req:Request){
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "campaign-create"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);if(!assertSameOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});try{const s=await requirePermission("CAMPAIGNS");const b=schema.parse(await req.json());const campaign=await db.campaign.create({data:{cafeId:s.user.cafeId!,name:b.name,type:b.type,message:b.message,bonusPoints:b.bonusPoints||0,minDaysAway:b.minDaysAway||0,audience:b.audience}});await audit(s.user.cafeId!,s.user.id,"CAMPAIGN_CREATED","Campaign",campaign.id,{name:b.name,audience:b.audience});return NextResponse.json(campaign)}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Check the campaign fields and try again."},{status:400});console.error("cafe-campaigns",error);return NextResponse.json({error:"Unable to create campaign."},{status:500})}}
