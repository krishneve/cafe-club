import { db } from "@/lib/db";
import { customerSession } from "@/lib/auth";
import { CustomerShell } from "@/components/CustomerShell";
import Link from "next/link";

export default async function Customer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await db.cafe.findUnique({ where: { slug }, include: { features: true, membership: true } });
  if (!cafe) return <div className="p-10">Café not found.</div>;
  const s = await customerSession();
  const c = s?.session.cafeId === cafe.id ? s.customer : null;
  if (!c) return <CustomerShell slug={slug} cafeName={cafe.name} primaryColor={cafe.primaryColor} accentColor={cafe.accentColor}><div className="overflow-hidden rounded-[30px] bg-[var(--brown)] p-7 text-white shadow-2xl sm:p-10"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">Welcome to your café club</span><div className="mt-7 text-5xl">☕</div><h1 className="mt-4 text-3xl font-black sm:text-4xl">Your rewards, in one place.</h1><p className="mt-3 max-w-xl leading-7 text-white/65">Verify your email to unlock this café's private loyalty wallet, rewards and member perks.</p><Link href={`/login?cafe=${slug}`} className="btn gold mt-7">Open my wallet <span>→</span></Link></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{[["⭐","Earn","Points and stamps on every eligible order"],["🎁","Unlock","Rewards, surprises and café offers"],["👑","Belong","Membership and referral perks"]].map(([i,t,d])=><div className="card p-5" key={t}><div className="text-2xl">{i}</div><div className="mt-3 font-black">{t}</div><div className="mt-1 text-sm muted">{d}</div></div>)}</div></CustomerShell>;
  const cfg = JSON.parse(cafe.features.find(x => x.feature === "STAMP_CARD")?.configJson || "{}");
  const n = Math.max(1, Number(cfg.stampsToReward || 8));
  const stampCount = Math.min(c.stamps, n);
  const remaining = Math.max(0, n - stampCount);
  const feature = (name: string) => cafe.features.find(x => x.feature === name)?.enabled;
  return <CustomerShell slug={slug} cafeName={cafe.name} primaryColor={cafe.primaryColor} accentColor={cafe.accentColor}>
    <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-bold text-[var(--muted)]">Good to see you,</div><h1 className="mt-1 text-2xl font-black sm:text-3xl">{c.name || "Coffee friend"} 👋</h1></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--soft)] text-xl">☕</div></div>
    <div className="mt-5 overflow-hidden rounded-[30px] p-6 text-white shadow-xl sm:p-7" style={{background:cafe.primaryColor}}>
      <div className="flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">{cafe.name}</div><div className="mt-3 text-5xl font-black tracking-tight">{c.pointsBalance}<span className="ml-2 text-sm font-bold text-white/45">points</span></div></div><div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black">{c.visits} visits</div></div>
      <div className="mt-7 flex items-end justify-between"><div><div className="text-sm font-bold">Stamp card</div><div className="mt-1 text-xs text-white/45">{remaining ? `${remaining} more to unlock your reward` : "Reward unlocked — show this to staff"}</div></div><span className="text-xs font-black text-[#e7b75e]">{stampCount}/{n}</span></div>
      <div className="mt-3 grid grid-cols-8 gap-2">{Array.from({ length: n }).map((_, i) => <div key={i} className={`grid aspect-square place-items-center rounded-xl text-sm font-black ${i < stampCount ? "text-[var(--brown)]" : "bg-white/10 text-white/25"}`} style={i < stampCount ? {background:cafe.accentColor} : undefined}>{i < stampCount ? "✓" : "•"}</div>)}</div>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Link className="card group p-4" href={`/c/${slug}/rewards`}><div className="text-2xl">🎁</div><div className="mt-3 font-black">Rewards</div><div className="mt-1 text-xs muted">Spend points</div></Link><Link className="card p-4" href={`/c/${slug}/offers`}><div className="text-2xl">🏷️</div><div className="mt-3 font-black">Offers</div><div className="mt-1 text-xs muted">Member-only deals</div></Link>
      {feature("SPIN_WHEEL") && <Link className="card p-4" href={`/c/${slug}/rewards`}><div className="text-2xl">🎡</div><div className="mt-3 font-black">Spin</div><div className="mt-1 text-xs muted">Daily surprise</div></Link>}
      {feature("SCRATCH_CARD") && <Link className="card p-4" href={`/c/${slug}/rewards`}><div className="text-2xl">🎟️</div><div className="mt-3 font-black">Scratch</div><div className="mt-1 text-xs muted">Reveal a prize</div></Link>}
      {feature("REFERRAL") && <Link className="card p-4" href={`/c/${slug}/refer`}><div className="text-2xl">👥</div><div className="mt-3 font-black">Refer</div><div className="mt-1 text-xs muted">Share the love</div></Link>}
      {feature("MEMBERSHIP") && <Link className="card p-4" href={`/c/${slug}/membership`}><div className="text-2xl">👑</div><div className="mt-3 font-black">Membership</div><div className="mt-1 text-xs muted">View your perks</div></Link>}
      <Link className="card p-4" href={`/c/${slug}/feedback`}><div className="text-2xl">💛</div><div className="mt-3 font-black">Feedback</div><div className="mt-1 text-xs muted">Tell us how it was</div></Link>
    </div>
    <div className="card mt-5 p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-widest muted">Member snapshot</div><div className="mt-2 font-black">₹{c.totalSpend.toLocaleString("en-IN")} spent here</div></div><Link href={`/c/${slug}/history`} className="text-sm font-black text-[var(--brown)]">View history →</Link></div></div>
  </CustomerShell>;
}
