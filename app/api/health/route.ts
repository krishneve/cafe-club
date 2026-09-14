import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ status: "ok", service: "cafeclub", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } }); }
