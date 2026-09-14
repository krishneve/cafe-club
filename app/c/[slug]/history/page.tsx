import { db } from "@/lib/db";
import { customerSession } from "@/lib/auth";
import { CustomerShell } from "@/components/CustomerShell";

export default async function History({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await db.cafe.findUnique({ where: { slug } });
  if (!cafe) return <div className="p-8">Café not found.</div>;
  const s = await customerSession();
  if (!s || s.session.cafeId !== cafe.id) return <CustomerShell slug={slug} cafeName={cafe.name} primaryColor={cafe.primaryColor} accentColor={cafe.accentColor}><div className="card p-8 text-center"><div className="text-4xl">🔐</div><h1 className="mt-4 text-2xl font-black">Your activity is private</h1><p className="mt-2 muted">Verify your email for this café to see your loyalty history.</p></div></CustomerShell>;
  const [rows, activities] = await Promise.all([
    db.transaction.findMany({ where: { cafeId: cafe.id, customerId: s.customer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.loyaltyActivity.findMany({ where: { cafeId: cafe.id, customerId: s.customer.id }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);
  return <CustomerShell slug={slug} cafeName={cafe.name} primaryColor={cafe.primaryColor} accentColor={cafe.accentColor}>
    <div><span className="badge">Your activity</span><h1 className="mt-3 text-3xl font-black tracking-tight">Your CafeClub history</h1><p className="mt-1 muted">Orders, points, stamps and rewards in one private timeline.</p></div>
    <section className="mt-6"><div className="text-xs font-black uppercase tracking-widest muted">Recent activity</div><div className="mt-3 grid gap-3">{activities.length===0?<div className="card p-6 text-center muted">Your loyalty activity will appear here after your first action.</div>:activities.map(a=><div className="card flex items-start gap-4 p-5" key={a.id}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--soft)]">{a.type==="REWARD_REDEEMED"?"🎁":a.type==="STAMP_REWARD"?"🎟️":"☕"}</div><div className="min-w-0 flex-1"><div className="font-black">{a.title}</div><div className="mt-1 text-sm muted">{a.description}</div><div className="mt-2 text-[11px] muted">{a.createdAt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div></div><div className="text-right text-xs font-black">{a.points>0&&<div className="text-[#8b621f]">+{a.points} pts</div>}{a.points<0&&<div className="text-red-700">{a.points} pts</div>}{a.stamps>0&&<div className="mt-1">+{a.stamps} stamp</div>}</div></div>)}</div></section>
    <section className="mt-8"><div className="text-xs font-black uppercase tracking-widest muted">Orders</div><div className="mt-3 grid gap-3">{rows.length===0?<div className="card p-8 text-center"><div className="text-4xl">☕</div><h2 className="mt-3 font-black">No orders yet</h2><p className="mt-1 text-sm muted">Your café team will add loyalty when you make a purchase.</p></div>:rows.map(x=><div key={x.id} className="card flex items-center justify-between p-5"><div><div className="font-black">{x.orderNumber}</div><div className="mt-1 text-xs muted">{x.createdAt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {x.paymentMethod}</div></div><div className="text-right"><div className="font-black">₹{x.amount.toLocaleString("en-IN")}</div><div className="mt-1 text-xs font-bold text-[#8b621f]">+{x.pointsEarned} pts · +{x.stampsEarned} stamp</div></div></div>)}</div></section>
  </CustomerShell>;
}
