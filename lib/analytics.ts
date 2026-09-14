import { db } from "./db";

export type AnalyticsRange = 7 | 30 | 90;

export function parseRange(value?: string): AnalyticsRange {
  return value === "7" || value === "90" ? Number(value) as AnalyticsRange : 30;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCafeAnalytics(cafeId: string, range: AnalyticsRange) {
  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - (range - 1) * 86400000));
  const previousStart = new Date(start.getTime() - range * 86400000);

  const [transactions, previousTransactions, customers, rewards, redemptions, feedback, campaigns, notifications] = await Promise.all([
    db.transaction.findMany({ where: { cafeId, createdAt: { gte: start } }, orderBy: { createdAt: "asc" }, include: { customer: true } }),
    db.transaction.findMany({ where: { cafeId, createdAt: { gte: previousStart, lt: start } }, select: { amount: true } }),
    db.customer.findMany({ where: { cafeId }, select: { id: true, name: true, email: true, totalSpend: true, visits: true, pointsBalance: true, createdAt: true, lastVisitAt: true } }),
    db.reward.findMany({ where: { cafeId }, select: { id: true, title: true, pointsCost: true, active: true } }),
    db.redemption.findMany({ where: { cafeId, createdAt: { gte: start } }, select: { rewardId: true, customerId: true, pointsSpent: true, createdAt: true } }),
    db.feedback.findMany({ where: { cafeId, createdAt: { gte: start } }, select: { rating: true } }),
    db.campaign.findMany({ where: { cafeId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, audience: true, recipientCount: true, sentAt: true, createdAt: true, active: true } }),
    db.notificationLog.findMany({ where: { cafeId, createdAt: { gte: start } }, select: { status: true, campaignId: true } }),
  ]);

  const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.amount, 0);
  const revenueChange = previousRevenue === 0 ? (revenue > 0 ? 100 : 0) : ((revenue - previousRevenue) / previousRevenue) * 100;
  const averageOrder = transactions.length ? revenue / transactions.length : 0;
  const uniqueCustomerIds = new Set(transactions.map(t => t.customerId));
  const repeatCustomers = customers.filter(c => c.visits >= 2).length;
  const retentionRate = customers.length ? (repeatCustomers / customers.length) * 100 : 0;
  const newCustomers = customers.filter(c => c.createdAt >= start).length;
  const ltv = customers.length ? customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length : 0;
  const pointsIssued = transactions.reduce((s, t) => s + t.pointsEarned, 0);
  const stampsIssued = transactions.reduce((s, t) => s + t.stampsEarned, 0);
  const rating = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;
  const sent = notifications.filter(n => n.status === "SENT").length;
  const failed = notifications.filter(n => n.status === "FAILED").length;

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < range; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    dailyMap.set(dayKey(d), { revenue: 0, orders: 0 });
  }
  for (const t of transactions) {
    const k = dayKey(t.createdAt);
    const row = dailyMap.get(k);
    if (row) { row.revenue += t.amount; row.orders += 1; }
  }
  const daily = [...dailyMap.entries()].map(([date, value]) => ({ date, ...value }));
  const maxDailyRevenue = Math.max(1, ...daily.map(d => d.revenue));

  const topMap = new Map<string, { id: string; name: string; email: string; spend: number; orders: number; points: number }>();
  for (const t of transactions) {
    const existing = topMap.get(t.customerId) ?? { id: t.customerId, name: t.customer.name || "Customer", email: t.customer.email, spend: 0, orders: 0, points: 0 };
    existing.spend += t.amount;
    existing.orders += 1;
    existing.points += t.pointsEarned;
    topMap.set(t.customerId, existing);
  }
  const topCustomers = [...topMap.values()].sort((a, b) => b.spend - a.spend).slice(0, 8);

  const rewardMap = new Map<string, { title: string; redemptions: number; points: number }>();
  for (const r of rewards) rewardMap.set(r.id, { title: r.title, redemptions: 0, points: 0 });
  for (const r of redemptions) {
    const x = rewardMap.get(r.rewardId);
    if (x) { x.redemptions += 1; x.points += r.pointsSpent; }
  }
  const rewardPerformance = [...rewardMap.values()].filter(r => r.redemptions > 0).sort((a, b) => b.redemptions - a.redemptions).slice(0, 6);

  return {
    range, start, revenue, previousRevenue, revenueChange, orders: transactions.length, averageOrder,
    uniqueCustomers: uniqueCustomerIds.size, totalCustomers: customers.length, newCustomers,
    repeatCustomers, retentionRate, ltv, pointsIssued, stampsIssued, rating,
    rewardRedemptions: redemptions.length, sent, failed, daily, maxDailyRevenue, topCustomers, rewardPerformance,
    campaignSummary: campaigns.map(c => ({ ...c, deliverySent: notifications.filter(n => n.campaignId === c.id && n.status === "SENT").length })),
  };
}

export async function getPlatformAnalytics() {
  const [cafes, subscriptions, customers, transactions, revenue, plans] = await Promise.all([
    db.cafe.count(),
    db.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    db.customer.count(),
    db.transaction.count(),
    db.transaction.aggregate({ _sum: { amount: true } }),
    db.plan.findMany({ select: { name: true, monthlyPrice: true, _count: { select: { subscriptions: true } } }, orderBy: { monthlyPrice: "asc" } }),
  ]);
  const active = subscriptions.find(s => s.status === "ACTIVE")?._count._all ?? 0;
  const trialing = subscriptions.find(s => s.status === "TRIALING")?._count._all ?? 0;
  const pastDue = subscriptions.find(s => s.status === "PAST_DUE")?._count._all ?? 0;
  const estimatedMrr = plans.reduce((sum, p) => sum + p.monthlyPrice * p._count.subscriptions, 0);
  return { cafes, customers, transactions, revenue: revenue._sum.amount ?? 0, active, trialing, pastDue, estimatedMrr, plans };
}
