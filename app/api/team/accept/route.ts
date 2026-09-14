import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { login } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";
const hash=(x:string)=>crypto.createHash("sha256").update(x).digest("hex");
const schema=z.object({token:z.string().min(20),name:z.string().trim().min(2).max(100).optional()});
export async function POST(req:Request){if(!assertSameOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});try{const b=schema.parse(await req.json());const inv=await db.staffInvite.findUnique({where:{tokenHash:hash(b.token)},include:{cafe:true}});if(!inv||inv.acceptedAt||inv.expiresAt<=new Date())return NextResponse.json({error:"This invitation is invalid or expired."},{status:400});const u=await db.$transaction(async tx=>{const user=await tx.user.create({data:{email:inv.email,name:b.name||inv.name||null,role:"STAFF",cafeId:inv.cafeId,staffRole:inv.staffRole}});await tx.staffInvite.update({where:{id:inv.id},data:{acceptedAt:new Date()}});await tx.auditLog.create({data:{cafeId:inv.cafeId,userId:user.id,action:"INVITE_ACCEPTED",entity:"StaffInvite",entityId:inv.id}});return user});await login(u.id,inv.cafeId);return NextResponse.json({redirect:"/admin/pos"});}catch(e:any){if(e instanceof z.ZodError)return NextResponse.json({error:"Please enter your name."},{status:400});return NextResponse.json({error:"Unable to accept invitation. The email may already be in use."},{status:409});}}
