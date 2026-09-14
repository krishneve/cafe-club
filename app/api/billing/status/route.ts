import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/permissions";
import { getCafeBilling } from "@/lib/billing";
export async function GET(){try{const s=await requireOwner();if(!s.user.cafeId)return NextResponse.json({error:"No café assigned."},{status:400});const {cafe,subscription}=await getCafeBilling(s.user.cafeId);return NextResponse.json({cafe:{id:cafe.id,name:cafe.name,email:cafe.email},subscription})}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
