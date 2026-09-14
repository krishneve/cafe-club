import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
export async function GET(){try{const s=await requirePermission("CAMPAIGNS");return NextResponse.json(await db.notificationLog.findMany({where:{cafeId:s.user.cafeId!},include:{customer:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"},take:100}));}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
