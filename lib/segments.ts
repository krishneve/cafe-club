import { db } from "@/lib/db";

export const SEGMENTS = {
  ALL: "All customers",
  VIP: "VIP customers (₹5,000+ spend)",
  INACTIVE_30: "Inactive 30+ days",
  NEW_30: "Joined in last 30 days",
  BIRTHDAY_7: "Birthdays in next 7 days",
  POINTS_500: "500+ points",
} as const;
export type SegmentKey = keyof typeof SEGMENTS;

function windowForDays(days: number) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400000);
  return { now, end };
}

export async function segmentCustomers(cafeId: string, segment: SegmentKey) {
  const base = { cafeId };
  if (segment === "ALL") return db.customer.findMany({ where: base, orderBy: { createdAt: "desc" } });
  if (segment === "VIP") return db.customer.findMany({ where: { ...base, totalSpend: { gte: 5000 } }, orderBy: { totalSpend: "desc" } });
  if (segment === "INACTIVE_30") {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    return db.customer.findMany({ where: { ...base, OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }] }, orderBy: { lastVisitAt: "asc" } });
  }
  if (segment === "NEW_30") return db.customer.findMany({ where: { ...base, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, orderBy: { createdAt: "desc" } });
  if (segment === "POINTS_500") return db.customer.findMany({ where: { ...base, pointsBalance: { gte: 500 } }, orderBy: { pointsBalance: "desc" } });
  const { now, end } = windowForDays(7);
  return db.customer.findMany({ where: { ...base, birthday: { not: null } }, orderBy: { birthday: "asc" } }).then(rows => rows.filter(c => {
    if (!c.birthday) return false;
    const b = new Date(c.birthday);
    const candidate = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidate.setFullYear(candidate.getFullYear() + 1);
    return candidate >= now && candidate <= end;
  }));
}

export async function segmentCounts(cafeId: string) {
  const [all, vip, inactive, fresh, birthday, points] = await Promise.all([
    segmentCustomers(cafeId, "ALL"), segmentCustomers(cafeId, "VIP"), segmentCustomers(cafeId, "INACTIVE_30"),
    segmentCustomers(cafeId, "NEW_30"), segmentCustomers(cafeId, "BIRTHDAY_7"), segmentCustomers(cafeId, "POINTS_500"),
  ]);
  return { ALL: all.length, VIP: vip.length, INACTIVE_30: inactive.length, NEW_30: fresh.length, BIRTHDAY_7: birthday.length, POINTS_500: points.length };
}
