import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import crypto from "crypto";
import { assertSameOrigin } from "@/lib/security";

const hash = (x: string) => crypto.createHmac("sha256", process.env.SESSION_SECRET || "dev-secret").update(x).digest("hex");

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const jar = await cookies();
  const raw = jar.get("cc_session")?.value;
  if (raw) await db.session.deleteMany({ where: { tokenHash: hash(raw) } });
  jar.delete("cc_session");
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
