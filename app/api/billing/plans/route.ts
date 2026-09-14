import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
export async function GET(){try{await requireOwner();const plans=await db.plan.findMany({where:{active:true},orderBy:{monthlyPrice:"asc"},select:{id:true,name:true,monthlyPrice:true,maxCustomers:true,features:true,stripePriceId:true}});return NextResponse.json({plans})}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
