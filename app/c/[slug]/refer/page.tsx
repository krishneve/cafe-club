"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function Refer() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/customer/referral").then(r => r.json()).then(setData); }, []);
  async function claim() {
    setMsg(""); setBusy(true);
    const r = await fetch("/api/customer/referral/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await r.json(); setMsg(j.message || j.error || "Done"); setBusy(false);
    if (r.ok) setCode("");
  }
  const customer = data?.customer;
  return <div className="mx-auto max-w-2xl">
    <Link href={`/c/${slug}`} className="text-sm text-[var(--muted)]">← My wallet</Link>
    <span className="badge mt-5">Growth loop</span>
    <h1 className="mt-3 text-3xl font-black">Share the coffee love.</h1>
    <p className="mt-1 muted">Give a friend a reason to visit and earn a bonus when their first order is completed.</p>
    <div className="mt-6 overflow-hidden rounded-[30px] bg-[var(--brown)] p-7 text-white shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-white/45">Your personal referral code</div>
      <div className="mt-3 text-4xl font-black tracking-tight">{customer?.referralCode || "Loading…"}</div>
      <button className="btn gold mt-6 w-full" type="button" onClick={() => navigator.clipboard?.writeText(customer?.referralCode || "")}>Copy referral code</button>
    </div>
    <div className="card mt-5 p-6">
      <div className="text-xs font-black uppercase tracking-widest muted">Were you invited?</div>
      <h2 className="mt-2 text-xl font-black">Attach a friend's code</h2>
      <p className="mt-1 text-sm muted">This stays private to this café. Your first qualifying order completes the referral.</p>
      <div className="mt-4 flex gap-2"><input className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="BEAN-ABC12"/><button className="btn primary" disabled={!code.trim() || busy} onClick={claim}>{busy ? "…" : "Apply"}</button></div>
      {msg && <div className="mt-4 rounded-2xl bg-[var(--soft)] p-4 text-sm font-bold">{msg}</div>}
    </div>
  </div>;
}
