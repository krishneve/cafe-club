"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/billing/status").then(r=>r.json()).then(setData); fetch("/api/billing/plans").then(r=>r.json()).then(j=>setPlans(j.plans||[])); }, []);
  async function checkout(planId:string){setBusy(planId);setMessage("");try{const r=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({planId})});const j=await r.json();if(!r.ok){setMessage(j.error||"Unable to start checkout.");return}if(j.url) window.location.href=j.url;}finally{setBusy("")}}
  async function portal(){setBusy("portal");setMessage("");try{const r=await fetch("/api/billing/portal",{method:"POST"});const j=await r.json();if(!r.ok){setMessage(j.error||"Unable to open billing.");return}window.location.href=j.url;}finally{setBusy("")}}
  if(!data) return <div className="card p-8">Loading billing…</div>;
  const sub=data.subscription; const current=sub?.plan;
  return <div><div className="flex flex-wrap items-start justify-between gap-5"><div><span className="badge">Billing</span><h1 className="mt-3 text-3xl font-black">Your CafeClub plan</h1><p className="mt-2 muted">Manage your subscription without leaving your café workspace.</p></div>{sub?.stripeCustomerId&&<button className="btn soft" onClick={portal}><CreditCard size={16}/> {busy==="portal"?"Opening…":"Manage billing"}</button>}</div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="card p-6"><div className="text-xs font-black uppercase tracking-widest muted">Current access</div><div className="mt-4 text-3xl font-black">{current?.name||"No plan"}</div><div className="mt-2 text-sm muted">Status: <b className="text-[var(--brown)]">{sub?.status||"—"}</b></div>{sub?.status==="TRIALING"&&sub.currentPeriodEnd&&<div className="mt-5 rounded-2xl bg-[#fff5dc] p-4 text-sm font-semibold">Your trial ends on {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN",{dateStyle:"medium"})}.</div>}<div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--soft)] p-4"><ShieldCheck size={18} className="mt-0.5"/><div className="text-xs leading-5 muted">Payments are handled by Stripe. CafeClub never stores your card number.</div></div></div>
      <div className="grid gap-4 md:grid-cols-3">{plans.map(p=><div key={p.id} className={`card p-5 ${current?.id===p.id?"ring-2 ring-[var(--gold)]":""}`}><div className="flex items-center justify-between"><div className="font-black">{p.name}</div>{current?.id===p.id&&<span className="badge">Current</span>}</div><div className="mt-3 text-3xl font-black">₹{Number(p.monthlyPrice).toLocaleString("en-IN")}<span className="text-xs font-bold muted"> / mo</span></div><div className="mt-4 grid gap-2">{p.features.split(",").map((f:string)=><div className="flex gap-2 text-xs font-semibold" key={f}><Check size={14}/>{f}</div>)}</div>{current?.id!==p.id&&<button disabled={!!busy} onClick={()=>checkout(p.id)} className="btn primary mt-5 w-full">{busy===p.id?"Opening checkout…":<>Choose {p.name}<ArrowRight size={14}/></>}</button>}</div>)}</div></div>{message&&<div className="mt-5 rounded-2xl bg-[#f6e4df] p-4 text-sm font-bold text-[#8b2e24]">{message}</div>}<div className="mt-5 text-xs muted">Need help? <Link href="/admin/settings" className="font-bold text-[var(--brown)]">Open café settings →</Link></div></div>
}
