import { db } from "@/lib/db";
import { Resend } from "resend";
import { segmentCustomers, type SegmentKey } from "@/lib/segments";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]!));
}

export async function sendCampaign(campaignId: string, cafeId: string, segment: SegmentKey) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, cafeId } });
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  const customers = (await segmentCustomers(cafeId, segment)).slice(0, 100);
  if (!customers.length) return { sent: 0, simulated: !process.env.RESEND_API_KEY };

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  let sent = 0;
  for (const customer of customers) {
    const subject = campaign.name;
    const message = campaign.message.replaceAll("{{name}}", customer.name || "there");
    const log = await db.notificationLog.create({ data: { cafeId, customerId: customer.id, campaignId, channel: "EMAIL", subject, status: resend ? "QUEUED" : "SIMULATED" } });
    if (!resend) { sent++; await db.notificationLog.update({ where: { id: log.id }, data: { sentAt: new Date() } }); continue; }
    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || "CafeClub <onboarding@resend.dev>", to: customer.email, subject,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px"><h2>${escapeHtml(campaign.name)}</h2><p>${escapeHtml(message).replaceAll("\n", "<br/>")}</p><p style="color:#8b7768;font-size:12px">Sent by ${escapeHtml((await db.cafe.findUnique({where:{id:cafeId},select:{name:true}}))?.name || "your café")}</p></div>`
      });
      if (result.error) throw new Error(result.error.message);
      sent++; await db.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } });
    } catch (error) {
      await db.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0,500) : "Email failed" } });
    }
  }
  await db.campaign.update({ where: { id: campaignId }, data: { audience: segment, sentAt: new Date(), recipientCount: sent } });
  return { sent, simulated: !resend };
}
