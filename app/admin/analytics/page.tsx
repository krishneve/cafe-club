import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { StatCard } from "@/components/StatCard";
import {requirePermission} from "@/lib/permissions";
import { db } from "@/lib/db";
import { getCafeAnalytics, parseRange } from "@/lib/analytics";
import { ArrowDownRight, ArrowUpRight, BarChart3, Download, Users, Repeat2, Gift, Target } from "lucide-react";

function money(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }
function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const s = await requirePermission("ANALYTICS");
  if (s.user.role === "SUPER_ADMIN") return <PlatformRedirect />;
  const params = await searchParams;
  const range = parseRange(params.range);
  const c = await db.cafe.findUnique({ where: { id: s.user.cafeId! }, select: { name: true } });
  if (!c) return null;
  const a = await getCafeAnalytics(s.user.cafeId!, range);
  return <AdminShell cafeName={c.name}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><span className="badge">Business intelligence</span><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Know what brings customers back.</h1><p className="mt-2 max-w-2xl text-sm leading-6 muted">Revenue, retention, loyalty and campaign performance in one simple view.</p></div>
      <div className="flex items-center gap-2"><div className="flex rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1">{[7,30,90].map(r=><Link key={r} href={`/admin/analytics?range=${r}`} className={`rounded-xl px-3 py-2 text-xs font-black ${range===r?"bg-[var(--brown)] text-white":"muted hover:bg-[var(--soft)]"}`}>{r}d</Link>)}</div><Link href="/admin/transactions" className="btn soft"><Download size={15}/> Orders</Link></div>
    </div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Revenue" value={money(a.revenue)} sub={`${pct(a.revenueChange)} vs previous period`} icon="₹" />
      <StatCard label="Orders" value={a.orders.toLocaleString("en-IN")} sub={`${a.uniqueCustomers} customers purchased`} icon="🧾" />
      <StatCard label="Average order" value={money(a.averageOrder)} sub="Revenue ÷ orders" icon="↗" />
      <StatCard label="Retention" value={`${a.retentionRate.toFixed(0)}%`} sub={`${a.repeatCustomers} repeat customers`} icon="↻" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
      <section className="card p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-black">Revenue trend</h2><p className="mt-1 text-xs muted">Daily recorded sales for the selected period.</p></div><BarChart3 size={20} className="muted"/></div><div className="mt-7 flex h-64 items-end gap-1 sm:gap-2">{a.daily.map(d=><div key={d.date} className="group flex min-w-0 flex-1 flex-col justify-end"><div className="relative flex-1"><div title={`${d.date}: ${money(d.revenue)}`} className="absolute bottom-0 left-1/2 w-full max-w-7 rounded-t-lg bg-[var(--brown)] transition-all group-hover:bg-[var(--gold)]" style={{height:`${Math.max(d.revenue?3:0,(d.revenue/a.maxDailyRevenue)*100)}%`,transform:"translateX(-50%)"}}/></div><div className="mt-2 truncate text-center text-[9px] muted">{new Date(d.date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div></div>)}</div></section>
      <section className="card p-5 sm:p-6"><h2 className="font-black">Customer health</h2><div className="mt-5 grid gap-3">{[[Users,"Total customers",a.totalCustomers.toLocaleString("en-IN")],[Repeat2,"Repeat customers",a.repeatCustomers.toLocaleString("en-IN")],[Target,"New customers",a.newCustomers.toLocaleString("en-IN")],["💎","Customer lifetime value",money(a.ltv)]].map(([I,label,value])=>{const Icon=typeof I==="string"?null:I as any;return <div key={label as string} className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--card)] text-[var(--brown)]">{Icon?<Icon size={17}/>:I}</div><div><div className="text-xs muted">{label as string}</div><div className="mt-0.5 text-lg font-black">{value as string}</div></div></div>})}</div></section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="card overflow-hidden"><div className="border-b border-[var(--line)] p-5"><h2 className="font-black">Top customers</h2><p className="mt-1 text-xs muted">Highest spend during this period.</p></div>{a.topCustomers.length===0?<Empty text="No orders in this period."/>:a.topCustomers.map((x,i)=><div key={x.id} className="flex items-center gap-3 border-b border-[var(--line)] p-4 last:border-0"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-xs font-black">{i+1}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{x.name}</div><div className="truncate text-xs muted">{x.orders} orders · +{x.points} points</div></div><div className="font-black">{money(x.spend)}</div></div>)}</section>
      <section className="card overflow-hidden"><div className="border-b border-[var(--line)] p-5"><h2 className="font-black">Reward performance</h2><p className="mt-1 text-xs muted">Which rewards customers actually redeem.</p></div>{a.rewardPerformance.length===0?<Empty text="No rewards redeemed in this period."/>:a.rewardPerformance.map(x=><div key={x.title} className="flex items-center gap-3 border-b border-[var(--line)] p-4 last:border-0"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--soft)]"><Gift size={16}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{x.title}</div><div className="text-xs muted">{x.points.toLocaleString("en-IN")} points spent</div></div><div className="text-right"><div className="font-black">{x.redemptions}</div><div className="text-[10px] muted">redemptions</div></div></div>)}</section>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Points issued" value={a.pointsIssued.toLocaleString("en-IN")} sub={`${a.stampsIssued} stamps issued`} icon="★"/><StatCard label="Rewards redeemed" value={String(a.rewardRedemptions)} sub="In selected period" icon="🎁"/><StatCard label="Customer rating" value={a.rating? a.rating.toFixed(1):"—"} sub="Average feedback rating" icon="♥"/><StatCard label="Emails sent" value={String(a.sent)} sub={`${a.failed} failed`} icon="✉"/></div>
    <section className="card mt-6 overflow-hidden"><div className="border-b border-[var(--line)] p-5"><h2 className="font-black">Campaign performance</h2><p className="mt-1 text-xs muted">Recent campaigns and their delivery counts.</p></div>{a.campaignSummary.length===0?<Empty text="Create your first campaign to see performance here."/>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[var(--soft)] text-[10px] uppercase tracking-wider muted"><tr><th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Audience</th><th className="px-5 py-3">Recipients</th><th className="px-5 py-3">Delivered</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{a.campaignSummary.map(x=><tr key={x.id} className="border-t border-[var(--line)]"><td className="px-5 py-4 font-black">{x.name}</td><td className="px-5 py-4 text-xs muted">{x.audience}</td><td className="px-5 py-4">{x.recipientCount}</td><td className="px-5 py-4">{x.deliverySent}</td><td className="px-5 py-4"><span className="badge">{x.active?"Active":"Paused"}</span></td></tr>)}</tbody></table></div>}</section>
  </AdminShell>;
}
function Empty({text}:{text:string}){return <div className="p-10 text-center text-sm muted">{text}</div>}
async function PlatformRedirect(){return <AdminShell superAdmin><span className="badge">Platform</span><h1 className="mt-3 text-3xl font-black">Platform analytics</h1><p className="mt-2 muted">Use the platform analytics view for SaaS-wide metrics.</p><Link className="btn primary mt-5" href="/admin/platform-analytics">Open platform analytics</Link></AdminShell>}
