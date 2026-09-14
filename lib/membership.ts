import { db } from "./db";

export function membershipExpiry(start: Date, durationDays: number) {
  return new Date(start.getTime() + Math.max(1, durationDays) * 86400000);
}

export async function syncMembership(cafeId: string, customerId: string) {
  const membership = await db.membership.findUnique({ where: { cafeId_customerId: { cafeId, customerId } }, include: { cafe: { include: { membership: true } } } });
  if (!membership) return null;
  if (membership.status === "ACTIVE" && membership.expiresAt && membership.expiresAt <= new Date()) {
    return db.membership.update({ where: { id: membership.id }, data: { status: "EXPIRED" } });
  }
  return membership;
}
