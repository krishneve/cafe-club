import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(){const s=await customerSession();if(!s)return NextResponse.json({error:"Sign in required."},{status:401});const rows=await db.loyaltyActivity.findMany({where:{cafeId:s.session.cafeId!,customerId:s.customer.id},orderBy:{createdAt:"desc"},take:50});return NextResponse.json(rows);}
