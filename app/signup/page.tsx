"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Store } from "lucide-react";

const plans = [
  { id: "Starter", price: 999, desc: "For cafés starting loyalty", features: ["Points + stamps", "Rewards + referrals", "Up to 1,000 customers"] },
  { id: "Growth", price: 1999, desc: "For growing cafés", features: ["Everything in Starter", "Campaigns + gamification", "Up to 5,000 customers"] },
  { id: "Pro", price: 3999, desc: "For serious retention", features: ["Everything in Growth", "Membership + advanced retention", "Unlimited customers"] },
];

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ ownerName: "", cafeName: "", email: "", phone: "", slug: "", plan: "Growth" });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  function set(k: string, v: string) { setForm(x => ({ ...x, [k]: v })); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/cafe/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json(); if (!r.ok) { setMsg(j.error || "Unable to create café."); return; }
      router.push(`/login?cafe=${j.slug}&onboarded=1`);
    } catch { setMsg("Network error. Please try again."); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[var(--cream)] px-4 py-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between"><Link href="/" className="font-black text-2xl text-[var(--brown)]">CafeClub</Link><Link href="/login" className="text-sm font-bold muted">Already have an account? Log in</Link></header>
      <div className="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-[30px] bg-[var(--brown)] p-8 text-white sm:p-10">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Store /></div>
          <div className="mt-10 text-xs font-black uppercase tracking-[.2em] text-white/45">Café onboarding</div>
          <h1 className="mt-3 text-4xl font-black leading-tight">Set up your café in a few minutes.</h1>
          <p className="mt-4 leading-7 text-white/65">Choose your plan, create your workspace and start building a direct relationship with every customer who scans your QR.</p>
          <div className="mt-8 grid gap-3">{["Your own café workspace", "Branded customer loyalty wallet", "QR-based customer signup", "Points, stamps and rewards"].map(x => <div key={x} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/10"><Check size={15}/></span>{x}</div>)}</div>
        </section>
        <form onSubmit={submit} className="card p-6 sm:p-9">
          <span className="badge">Create workspace</span><h2 className="mt-4 text-3xl font-black">Tell us about your café</h2><p className="mt-2 muted">This creates the tenant workspace and a trial subscription. Payment activation comes after onboarding.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Owner name<input required className="input" value={form.ownerName} onChange={e=>set("ownerName",e.target.value)} placeholder="Your name"/></label>
            <label className="grid gap-2 text-sm font-bold">Café name<input required className="input" value={form.cafeName} onChange={e=>set("cafeName",e.target.value)} placeholder="Bean & Bloom Café"/></label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">Owner email<input required type="email" className="input" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="owner@yourcafe.com"/></label>
            <label className="grid gap-2 text-sm font-bold">Phone <span className="font-normal muted">optional</span><input className="input" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91..."/></label>
            <label className="grid gap-2 text-sm font-bold">Café URL code<input required className="input" value={form.slug} onChange={e=>set("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="your-cafe"/><span className="text-xs font-normal muted">Customer URL: /c/your-cafe</span></label>
          </div>
          <div className="mt-7"><div className="text-sm font-black">Choose your starting plan</div><div className="mt-3 grid gap-3">{plans.map(p=><label key={p.id} className={`cursor-pointer rounded-2xl border p-4 transition ${form.plan===p.id?"border-[var(--gold)] bg-[#fff7e8]":"border-[var(--line)] bg-white"}`}><input className="sr-only" type="radio" name="plan" value={p.id} checked={form.plan===p.id} onChange={()=>set("plan",p.id)}/><div className="flex items-start justify-between gap-4"><div><div className="font-black">{p.id}</div><div className="mt-1 text-xs muted">{p.desc}</div><div className="mt-3 flex flex-wrap gap-2">{p.features.map(f=><span className="badge" key={f}>{f}</span>)}</div></div><div className="text-right"><div className="text-xl font-black">₹{p.price.toLocaleString("en-IN")}</div><div className="text-xs muted">/ month</div></div></div></label>)}</div></div>
          <button disabled={busy} className="btn primary mt-7 w-full">{busy?"Creating workspace…":<>Create my café workspace <ArrowRight size={17}/></>}</button>
          {msg && <div className="mt-4 rounded-2xl bg-[#f6e4df] p-4 text-center text-sm font-bold text-[#8b2e24]">{msg}</div>}
        </form>
      </div>
    </div>
  </main>
}
