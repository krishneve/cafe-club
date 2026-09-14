import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { segmentCounts, SEGMENTS } from "@/lib/segments";
export async function GET() {
  try { const s=await requirePermission("CRM"); const counts=await segmentCounts(s.user.cafeId!); return NextResponse.json(Object.keys(SEGMENTS).map(key=>({key,label:SEGMENTS[key as keyof typeof SEGMENTS],count:counts[key as keyof typeof counts]}))); }
  catch { return NextResponse.json({error:"Unauthorized."},{status:401}); }
}
