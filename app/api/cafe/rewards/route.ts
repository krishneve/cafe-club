import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {assertSameOrigin, jsonError, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { audit } from "@/lib/audit";
const schema=z.object({title:z.string().trim().min(2).max(100),description:z.string().max(500).optional(),pointsCost:z.number().int().positive().max(1000000),type:z.enum(["DISCOUNT","FREE_ITEM","FREE_UPGRADE","POINTS"]),value:z.number().nonnegative().optional(),stock:z.number().int().positive().nullable().optional(),membersOnly:z.boolean().optional().default(false),active:z.boolean().optional().default(true)});
export async function GET(){try{const s=await requirePermission("REWARDS");return NextResponse.json(await db.reward.findMany({where:{cafeId:s.user.cafeId!},orderBy:{createdAt:"desc"}}))}catch{return jsonError("Unauthorized.",401)}}
export async function POST(req:Request){
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "reward-write"), 20, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);if(!assertSameOrigin(req))return jsonError("Invalid request origin.",403);try{const s=await requirePermission("REWARDS");if(!s.user.cafeId)return jsonError("No café assigned.",400);const b=schema.parse(await req.json());const reward=await db.reward.create({data:{cafeId:s.user.cafeId,title:b.title,description:b.description||null,pointsCost:b.pointsCost,type:b.type,value:b.value??null,stock:b.stock??null,membersOnly:b.membersOnly,active:b.active}});await audit(s.user.cafeId,s.user.id,"REWARD_CREATED","Reward",reward.id,{title:b.title,pointsCost:b.pointsCost});return NextResponse.json(reward,{status:201})}catch(e){if(e instanceof z.ZodError)return jsonError(e.issues[0]?.message||"Check the reward fields.",400);return jsonError("Unable to create reward.",500)}}
