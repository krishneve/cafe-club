import { requireOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
import { validateEnv } from "@/lib/env";
import { appUrl } from "@/lib/billing";
import { CheckCircle2, CircleAlert, Database, Mail, CreditCard, Globe2, ShieldCheck } from "lucide-react";
import Link from "next/link";

function Check({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-2xl border border-[var(--line)] p-4"><div className="mt-0.5">{ok ? <CheckCircle2 size={19}/> : <CircleAlert size={19}/>}</div><div><div className="font-black">{title}</div><div className="mt-1 text-xs leading-5 muted">{detail}</div></div></div>;
}

export default async function SystemPage() {
  const s = await requireOwner();
  if (!s.user.cafeId) return null;
  const [cafe, dbCheck] = await Promise.all([
    db.cafe.findUnique({ where: { id: s.user.cafeId }, include: { subscription: { include: { plan: true } } } }),
    db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);
  if (!cafe) return null;
  const config = validateEnv({ production: process.env.NODE_ENV === "production" });
  const stripeLive = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_STARTER && process.env.STRIPE_PRICE_GROWTH && process.env.STRIPE_PRICE_PRO);
  const emailLive = Boolean(process.env.RESEND_API_KEY);
  const appConfigured = !appUrl().includes("localhost") || process.env.NODE_ENV !== "production";
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-5"><div><span className="badge">Production readiness</span><h1 className="mt-3 text-3xl font-black">System health</h1><p className="mt-2 max-w-2xl text-sm leading-6 muted">A private checklist for your café workspace. Secrets are never displayed here.</p></div><Link href="/admin/settings" className="btn soft">Café settings</Link></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2"><Check ok={dbCheck} title="Database" detail={dbCheck ? "PostgreSQL connection is responding." : "Database connection failed. Check DATABASE_URL and database availability."}/><Check ok={config.ok} title="Environment" detail={config.ok ? "Required environment variables have the expected shape." : config.errors.join(" ")}/><Check ok={emailLive} title="Transactional email" detail={emailLive ? "Resend is configured for live email." : "Resend is not configured. OTP and campaign email will use development/simulation behavior."}/><Check ok={stripeLive} title="Stripe billing" detail={stripeLive ? "Stripe secret, webhook and all plan prices are configured." : "Stripe is not fully configured. Add the secret, webhook secret and all three recurring price IDs."}/><Check ok={appConfigured} title="Public app URL" detail={appConfigured ? `Application URL is configured for this environment.` : "Production must use a public HTTPS application URL."}/><Check ok={Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)} title="Session security" detail="Production sessions require a strong SESSION_SECRET; cookies are HttpOnly and SameSite=Lax."/></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="card p-6"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-black">Go-live checklist</h2></div><div className="mt-5 grid gap-3 text-sm"><div>☐ Add production DATABASE_URL and run the reviewed Prisma migration.</div><div>☐ Add a 32+ character SESSION_SECRET.</div><div>☐ Configure Resend and verify the sender domain.</div><div>☐ Create Stripe recurring prices and paste their IDs.</div><div>☐ Configure the Stripe webhook endpoint and signing secret.</div><div>☐ Set NEXT_PUBLIC_APP_URL to the final HTTPS domain.</div><div>☐ Set CRON_SECRET and verify the daily automation cron.</div><div>☐ Configure database backups/point-in-time recovery with your PostgreSQL provider.</div><div>☐ Test `/api/health` and `/api/readiness` after deployment.</div></div></div><div className="card p-6"><div className="text-[10px] font-black uppercase tracking-widest muted">Useful endpoints</div><div className="mt-4 grid gap-3"><div className="rounded-2xl bg-[var(--soft)] p-4"><div className="font-black">Health</div><div className="mt-1 text-xs muted">{appUrl("/api/health")}</div></div><div className="rounded-2xl bg-[var(--soft)] p-4"><div className="font-black">Readiness</div><div className="mt-1 text-xs muted">{appUrl("/api/readiness")}</div></div></div><div className="mt-5 text-xs leading-5 muted">Readiness intentionally reports only configuration state and database health; it does not expose secret values.</div></div></div>
  </div>;
}
