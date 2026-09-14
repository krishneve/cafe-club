import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
const schema=z.object({emailOptOut:z.boolean()});
export async function GET(){const s=await customerSession();if(!s)return NextResponse.json({error:"Sign in required."},{status:401});return NextResponse.json({emailOptOut:s.customer.emailOptOut});}
export async function PUT(req:Request){
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "customer-settings"), 20, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);if(!assertSameOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});const s=await customerSession();if(!s)return NextResponse.json({error:"Sign in required."},{status:401});try{const b=schema.parse(await req.json());await db.customer.update({where:{id:s.customer.id},data:{emailOptOut:b.emailOptOut}});return NextResponse.json({emailOptOut:b.emailOptOut});}catch{return NextResponse.json({error:"Unable to update email preferences."},{status:400})}}
