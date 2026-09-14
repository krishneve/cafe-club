import { db } from "./db";
import { Resend } from "resend";

function dayKey() { return new Date().toISOString().slice(0, 10); }
function html(s: string) { return s.replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!)); }

export async function syncMembershipLifecycle(cafeId?: string) {
  const now = new Date();
  const expiringUntil = new Date(now.getTime() + 7 * 86400000);
  const where = { ...(cafeId ? { cafeId } : {}), status: "ACTIVE" as const, expiresAt: { not: null as Date | null, lte: expiringUntil } };
  const memberships = await db.membership.findMany({ where, include: { cafe: true, customer: true } });
  let expired = 0, reminders = 0, failed = 0;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  for (const m of memberships) {
    if (m.expiresAt && m.expiresAt <= now) {
      await db.membership.update({ where: { id: m.id }, data: { status: "EXPIRED" } });
      await db.loyaltyActivity.create({ data: { cafeId: m.cafeId, customerId: m.customerId, type: "MEMBERSHIP_EXPIRED", title: "Membership expired", description: `Your ${m.cafe.name} membership has expired.`, points: 0, stamps: 0 } });
      expired++;
      continue;
    }
    if (!m.expiresAt || m.customer.emailOptOut) continue;
    const days = Math.max(0, Math.ceil((m.expiresAt.getTime() - now.getTime()) / 86400000));
    if (days > 7 || days < 1) continue;
    const dedupeKey = `MEMBERSHIP_EXPIRING:${m.cafeId}:${m.customerId}:${dayKey()}`;
    const exists = await db.notificationLog.findUnique({ where: { dedupeKey } });
    if (exists) continue;
    const subject = `Your ${m.cafe.name} membership is expiring soon`;
    const body = `Hi ${m.customer.name || "there"}, your membership at ${m.cafe.name} expires in ${days} day${days === 1 ? "" : "s"}. Come in and keep enjoying your member benefits.`;
    const log = await db.notificationLog.create({ data: { cafeId: m.cafeId, customerId: m.customerId, channel: "EMAIL", subject, body, dedupeKey, status: resend ? "QUEUED" : "SIMULATED" } });
    if (!resend) { await db.notificationLog.update({ where: { id: log.id }, data: { sentAt: now } }); reminders++; continue; }
    try {
      const result = await resend.emails.send({ from: process.env.EMAIL_FROM || "CafeClub <onboarding@resend.dev>", to: m.customer.email, subject, html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px"><h2>${html(m.cafe.name)}</h2><p>${html(body)}</p><p style="color:#8b7768;font-size:12px">Manage your membership from your loyalty profile.</p></div>` });
      if (result.error) throw new Error(result.error.message);
      await db.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: now } }); reminders++;
    } catch (e) {
      failed++; await db.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0,500) : "Email failed" } });
    }
  }
  return { checked: memberships.length, expired, reminders, failed };
}

export function activeMembershipBenefits(config: { memberDiscountPercent: number; bonusPointsMultiplier: number; exclusiveRewards: boolean }) {
  return { memberDiscountPercent: Math.max(0, Math.min(100, Number(config.memberDiscountPercent || 0))), bonusPointsMultiplier: Math.max(1, Math.min(10, Number(config.bonusPointsMultiplier || 1))), exclusiveRewards: Boolean(config.exclusiveRewards) };
}
