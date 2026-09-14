import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { assertSameOrigin } from "@/lib/security";

export async function GET() {
  try { const s = await requirePermission("TEAM"); if (!s.user.cafeId) return NextResponse.json({error:"No café."},{status:400});
    const [staff, invites] = await Promise.all([
      db.user.findMany({where:{cafeId:s.user.cafeId,role:"STAFF"},select:{id:true,email:true,name:true,staffRole:true,createdAt:true}}),
      db.staffInvite.findMany({where:{cafeId:s.user.cafeId,acceptedAt:null,expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"},take:50,select:{id:true,email:true,name:true,staffRole:true,expiresAt:true,createdAt:true}})
    ]); return NextResponse.json({staff,invites});
  } catch(e:any){return NextResponse.json({error:e?.message==="FORBIDDEN"?"You don't have permission to manage the team.":"Unauthorized."},{status:e?.message==="FORBIDDEN"?403:401});}
}
