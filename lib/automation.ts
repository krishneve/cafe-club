import { db } from "@/lib/db";
import { Resend } from "resend";
import { segmentCustomers, type SegmentKey } from "@/lib/segments";

export type AutomationKey = "BIRTHDAY" | "WIN_BACK_30" | "FIRST_ORDER" | "REWARD_READY";

export const AUTOMATIONS: Record<AutomationKey, { name: string; audience: SegmentKey; subject: string; message: string; description: string }> = {
  BIRTHDAY: { name: "Birthday Treat", audience: "BIRTHDAY_7", subject: "A little birthday treat from {{cafe}} 🎂", message: "Happy birthday, {{name}}! Come celebrate with us. We've saved a little treat for you.", description: "Reach customers with a birthday coming up in the next 7 days." },
  WIN_BACK_30: { name: "30-Day Win Back", audience: "INACTIVE_30", subject: "We miss you at {{cafe}} ☕", message: "Hi {{name}}, it has been a while! Come back and enjoy a little extra loyalty love.", description: "Bring back customers who have not visited for 30+ days." },
  FIRST_ORDER: { name: "First Order Follow-up", audience: "NEW_30", subject: "Thanks for visiting {{cafe}}!", message: "Hi {{name}}, thanks for joining us. We hope to see you again soon!", description: "Follow up with customers who recently joined." },
  REWARD_READY: { name: "Reward Ready", audience: "POINTS_500", subject: "You have a reward waiting at {{cafe}} 🎁", message: "Hi {{name}}, you have enough points to unlock a reward. Come by and use them!", description: "Remind customers who have enough points to redeem a reward." },
};

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]!)); }
function dayKey() { return new Date().toISOString().slice(0, 10); }
function personalize(text: string, customer: { name: string | null }, cafeName: string) { return text.replaceAll("{{name}}", customer.name || "there").replaceAll("{{cafe}}", cafeName); }

async function isEnabled(cafeId: string, key: AutomationKey) {
  const setting = await db.automationSetting.findUnique({ where: { cafeId_key: { cafeId, key } } });
  return setting?.enabled ?? true;
}

export async function runCafeAutomation(cafeId: string, key: AutomationKey) {
  if (!(await isEnabled(cafeId, key))) return { skipped: true, disabled: true, sent: 0, failed: 0, simulated: false };
  const cafe = await db.cafe.findUnique({ where: { id: cafeId }, select: { id: true, name: true } });
  if (!cafe) throw new Error("CAFE_NOT_FOUND");
  const config = AUTOMATIONS[key];
  const runKey = `${cafeId}:${key}:${dayKey()}`;
  const existing = await db.automationRun.findUnique({ where: { runKey } });
  if (existing) return { skipped: true, disabled: false, sent: existing.sentCount, failed: existing.failedCount, simulated: existing.simulated };

  let customers = await segmentCustomers(cafeId, config.audience);
  if (key === "FIRST_ORDER") {
    const recent = new Date(Date.now() - 7 * 86400000);
    customers = (await db.customer.findMany({
      where: { cafeId, emailOptOut: false, transactions: { some: { createdAt: { gte: recent } } } },
      include: { _count: { select: { transactions: true } } },
      orderBy: { createdAt: "desc" }
    })).filter(c => c._count.transactions === 1);
  }
  customers = customers.filter(c => !c.emailOptOut).slice(0, 500);
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  let run;
  try {
    run = await db.automationRun.create({ data: { cafeId, key, runKey, status: "RUNNING" } });
  } catch (error) {
    const concurrent = await db.automationRun.findUnique({ where: { runKey } });
    if (concurrent) return { skipped: true, disabled: false, sent: concurrent.sentCount, failed: concurrent.failedCount, simulated: concurrent.simulated };
    throw error;
  }
  let sent = 0, failed = 0;
  try {
    for (const customer of customers) {
      const subject = personalize(config.subject, customer, cafe.name);
      const message = personalize(config.message, customer, cafe.name);
      const dedupeKey = key === "FIRST_ORDER" ? `${cafeId}:${key}:${customer.id}` : `${cafeId}:${key}:${customer.id}:${dayKey()}`;
      const alreadySent = await db.notificationLog.findUnique({ where: { dedupeKey } });
      if (alreadySent) continue;
      const log = await db.notificationLog.create({ data: { cafeId, customerId: customer.id, channel: "EMAIL", subject, body: message, dedupeKey, status: resend ? "QUEUED" : "SIMULATED" } });
      if (!resend) { sent++; await db.notificationLog.update({ where: { id: log.id }, data: { sentAt: new Date() } }); continue; }
      try { const result = await resend.emails.send({ from: process.env.EMAIL_FROM || "CafeClub <onboarding@resend.dev>", to: customer.email, subject, html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px"><h2>${escapeHtml(cafe.name)}</h2><p>${escapeHtml(message).replaceAll("\n", "<br/>")}</p><p style="color:#8b7768;font-size:12px">You are receiving this because you joined ${escapeHtml(cafe.name)}. You can opt out from your loyalty profile.</p></div>` }); if (result.error) throw new Error(result.error.message); sent++; await db.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } }); }
      catch (error) { failed++; await db.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "Email failed" } }); }
    }
    await db.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", sentCount: sent, failedCount: failed, simulated: !resend, completedAt: new Date() } });
  } catch (error) {
    await db.automationRun.update({ where: { id: run.id }, data: { status: "FAILED", sentCount: sent, failedCount: failed, simulated: !resend, error: error instanceof Error ? error.message.slice(0, 500) : "Automation failed", completedAt: new Date() } });
    throw error;
  }
  return { skipped: false, disabled: false, sent, failed, simulated: !resend };
}

export async function runAllAutomations(cafeId: string) { return Promise.all((Object.keys(AUTOMATIONS) as AutomationKey[]).map(async key => ({ key, ...(await runCafeAutomation(cafeId, key)) }))); }

export async function getAutomationSettings(cafeId: string) {
  const rows = await db.automationSetting.findMany({ where: { cafeId }, orderBy: { key: "asc" } });
  return (Object.keys(AUTOMATIONS) as AutomationKey[]).map(key => ({ key, ...AUTOMATIONS[key], enabled: rows.find(r => r.key === key)?.enabled ?? true }));
}

export async function setAutomationSetting(cafeId: string, key: AutomationKey, enabled: boolean) {
  return db.automationSetting.upsert({ where: { cafeId_key: { cafeId, key } }, create: { cafeId, key, enabled }, update: { enabled } });
}
