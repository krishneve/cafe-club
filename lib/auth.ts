import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
const h = (x: string) => crypto.createHmac("sha256", secret).update(x).digest("hex");
const SESSION_DAYS = 30;

export async function session() {
  const raw = (await cookies()).get("cc_session")?.value;
  if (!raw) return null;

  const s = await db.session.findUnique({
    where: { tokenHash: h(raw) },
    include: { user: true },
  });

  if (!s) return null;
  if (s.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: s.id } }).catch(() => undefined);
    return null;
  }
  return s;
}

export async function login(userId: string, cafeId?: string, customerId?: string) {
  const raw = crypto.randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: h(raw),
      userId,
      cafeId,
      customerId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    },
  });

  (await cookies()).set("cc_session", raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function cafeAdmin() {
  const s = await session();
  if (!s || !["CAFE_ADMIN", "STAFF", "SUPER_ADMIN"].includes(s.user.role)) throw new Error("UNAUTHORIZED");
  if (s.user.role === "CAFE_ADMIN" && !s.user.cafeId) throw new Error("NO_CAFE");
  return s;
}

export async function superAdmin() {
  const s = await session();
  if (!s || s.user.role !== "SUPER_ADMIN") throw new Error("UNAUTHORIZED");
  return s;
}

export async function customerSession() {
  const s = await session();
  if (!s || s.user.role !== "CUSTOMER" || !s.cafeId || !s.customerId) return null;
  const customer = await db.customer.findFirst({ where: { id: s.customerId, cafeId: s.cafeId } });
  if (!customer) return null;
  return { session: s, customer };
}
