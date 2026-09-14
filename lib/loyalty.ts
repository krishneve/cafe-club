import { db } from "@/lib/db";
import { safeJson } from "@/lib/security";

export type LoyaltyResult = {
  points: number;
  stamps: number;
  completedCards: number;
  stampTarget: number;
};

export async function calculateLoyalty(cafeId: string, amount: number): Promise<LoyaltyResult> {
  const [pf, sf] = await Promise.all([
    db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "LOYALTY_POINTS" } } }),
    db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "STAMP_CARD" } } }),
  ]);
  const pc = safeJson<{ pointsPerRupee?: number; minOrder?: number }>(pf?.configJson || "{}", {});
  const sc = safeJson<{ stampsPerOrder?: number; stampsToReward?: number }>(sf?.configJson || "{}", {});
  const points = pf?.enabled && amount >= Number(pc.minOrder || 0)
    ? Math.floor(amount * Number(pc.pointsPerRupee || 0)) : 0;
  const stamps = sf?.enabled ? Math.max(0, Number(sc.stampsPerOrder || 1)) : 0;
  return { points, stamps, completedCards: 0, stampTarget: Math.max(1, Number(sc.stampsToReward || 8)) };
}
