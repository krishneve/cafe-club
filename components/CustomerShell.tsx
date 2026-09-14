"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, Users, Crown, History, MoreHorizontal, Settings, Tag } from "lucide-react";

export function CustomerShell({ slug, cafeName, children, primaryColor="#5a2f1d", accentColor="#d99a35" }: { slug:string; cafeName:string; children:React.ReactNode; primaryColor?:string; accentColor?:string }) {
  const pathname=usePathname();
  const links=[["Home",`/c/${slug}`,Home],["Rewards",`/c/${slug}/rewards`,Gift],["Refer",`/c/${slug}/refer`,Users],["History",`/c/${slug}/history`,History],["Member",`/c/${slug}/membership`,Crown]] as const;
  return <div className="min-h-screen pb-24" style={{"--cafe-primary":primaryColor,"--cafe-accent":accentColor} as React.CSSProperties}>
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><Link href={`/c/${slug}`} className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl text-lg text-white shadow-sm" style={{background:primaryColor}}>☕</div><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--muted)]">Loyalty club</div><div className="max-w-[190px] truncate text-sm font-black">{cafeName}</div></div></Link><div className="flex items-center gap-1"><Link href={`/c/${slug}/settings`} className="icon-btn" aria-label="Settings"><Settings size={17}/></Link><Link href={`/c/${slug}/feedback`} className="icon-btn" aria-label="Feedback"><MoreHorizontal size={18}/></Link></div></div></header>
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-8">{children}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto grid max-w-3xl grid-cols-5 border-t border-[var(--line)] bg-[var(--card)]/95 px-2 py-2 backdrop-blur-xl">{links.map(([label,href,Icon])=>{const active=href===`/c/${slug}`?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={`mobile-nav ${active?"active":""}`}><Icon size={18}/><span>{label}</span></Link>})}</nav>
  </div>;
}
