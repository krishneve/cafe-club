import { NextResponse } from "next/server";
import { customerSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(req:Request){const s=await customerSession();if(!s)return NextResponse.json({error:"Sign in required."},{status:401});const slug=new URL(req.url).searchParams.get("slug");const cafe=await db.cafe.findFirst({where:{id:s.session.cafeId!,...(slug?{slug}:{})},select:{name:true,primaryColor:true,accentColor:true}});if(!cafe)return NextResponse.json({error:"Café not found."},{status:404});return NextResponse.json({cafe});}
