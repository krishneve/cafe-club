import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import {assertSameOrigin, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { Resend } from "resend";

const schema=z.object({email:z.string().email().max(254),name:z.string().trim().min(2).max(100).optional(),staffRole:z.enum(["CASHIER","MANAGER"])})
const hash=(x:string)=>crypto.createHash("sha256").update(x).digest("hex");
export async function POST(req:Request){
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "team-invite"), 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
 if(!assertSameOrigin(req)) return NextResponse.json({error:"Invalid request origin."},{status:403});
 try{const s=await requirePermission("TEAM"); if(!s.user.cafeId) throw new Error("UNAUTHORIZED"); const b=schema.parse(await req.json()); const email=b.email.toLowerCase();
  const existing=await db.user.findFirst({where:{email,cafeId:s.user.cafeId}}); if(existing) return NextResponse.json({error:"This email already belongs to a café user."},{status:409});
  await db.staffInvite.deleteMany({where:{cafeId:s.user.cafeId,email,acceptedAt:null}});
  const raw=crypto.randomBytes(32).toString("hex"); const invite=await db.staffInvite.create({data:{cafeId:s.user.cafeId,email,name:b.name||null,staffRole:b.staffRole,tokenHash:hash(raw),expiresAt:new Date(Date.now()+7*86400000)}});
  const cafe=await db.cafe.findUnique({where:{id:s.user.cafeId},select:{name:true}}); const url=`${process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000"}/admin/team/accept?token=${raw}`;
  if(process.env.RESEND_API_KEY && process.env.EMAIL_FROM){ const resend=new Resend(process.env.RESEND_API_KEY); await resend.emails.send({from:process.env.EMAIL_FROM,to:email,subject:`You're invited to join ${cafe?.name||"your café"} on CafeClub`,html:`<div style="font-family:Arial;max-width:560px;margin:auto"><h2>Join ${cafe?.name||"your café"}</h2><p>You have been invited as a ${b.staffRole.toLowerCase()}.</p><p><a href="${url}">Accept invitation</a></p><p>This invitation expires in 7 days.</p></div>`}); }
  await db.auditLog.create({data:{cafeId:s.user.cafeId,userId:s.user.id,action:"INVITE_CREATED",entity:"StaffInvite",entityId:invite.id,metadataJson:JSON.stringify({email,staffRole:b.staffRole})}});
  return NextResponse.json({ok:true,inviteUrl:process.env.RESEND_API_KEY?undefined:url,message:process.env.RESEND_API_KEY?"Invitation sent by email.":"Invitation created. Copy the invite link below."});
 }catch(e:any){if(e instanceof z.ZodError)return NextResponse.json({error:"Enter a valid email and role."},{status:400});return NextResponse.json({error:e?.message==="FORBIDDEN"?"Only the café owner can manage the team.":"Unable to create invitation."},{status:e?.message==="FORBIDDEN"?403:500});}
}
