"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, ReceiptText, Utensils, Sparkles, Gift, Megaphone, UserRoundPlus, MessageSquareHeart, Crown, QrCode, Settings, Building2, CreditCard, Package, LogOut, ChevronRight, BellRing, BarChart3, UserCog, ShieldCheck, BadgePercent } from "lucide-react";
import { Logo } from "./Logo";
import { can, type Permission } from "@/lib/role-permissions";

const cafeLinks: readonly [string, string, any, Permission | null][] = [
  ["Overview", "/admin", LayoutDashboard, null], ["New Order", "/admin/pos", ShoppingBag, "POS"], ["Team", "/admin/team", UserCog, "TEAM"], ["Menu", "/admin/menu", Utensils, "MENU"], ["Customers", "/admin/customers", Users, "CUSTOMERS"], ["CRM", "/admin/crm", Users, "CRM"], ["Analytics", "/admin/analytics", BarChart3, "ANALYTICS"], ["Orders", "/admin/transactions", ReceiptText, "ORDERS"],
  ["Loyalty", "/admin/loyalty", Sparkles, "LOYALTY"], ["Rewards", "/admin/rewards", Gift, "REWARDS"], ["Campaigns", "/admin/campaigns", Megaphone, "CAMPAIGNS"], ["Offers", "/admin/offers", BadgePercent, "CAMPAIGNS"], ["Automations", "/admin/automations", BellRing, "AUTOMATIONS"],
  ["Referrals", "/admin/referrals", UserRoundPlus, "REFERRALS"], ["Feedback", "/admin/feedback", MessageSquareHeart, "FEEDBACK"], ["Membership", "/admin/membership", Crown, "MEMBERSHIP"],
  ["QR Code", "/admin/qr", QrCode, "CUSTOMERS"], ["Audit log", "/admin/audit", ReceiptText, "AUDIT"], ["Billing", "/admin/billing", CreditCard, "BILLING"], ["Settings", "/admin/settings", Settings, "SETTINGS"], ["System", "/admin/system", ShieldCheck, "SETTINGS"],
] as const;
const platformLinks = [["Overview", "/admin", LayoutDashboard], ["Cafés", "/admin/cafes", Building2], ["Plans", "/admin/plans", Package], ["Subscriptions", "/admin/subscriptions", CreditCard]] as const;

export function AdminShell({ children, cafeName = "Platform", superAdmin = false, staffRole }: { children: React.ReactNode; cafeName?: string; superAdmin?: boolean; staffRole?: string | null }) {
  const pathname = usePathname(); const links = superAdmin ? platformLinks.map(([label,href,Icon])=>[label,href,Icon,null] as const) : cafeLinks.filter(([, , , permission]) => !permission || !staffRole || can(staffRole, permission));
  return <div className="min-h-screen bg-[var(--cream)] pb-20 md:pb-0">
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4"><Logo /><span className="hidden h-5 w-px bg-[var(--line)] sm:block"/><div className="hidden text-sm font-black text-[var(--brown)] sm:block">{superAdmin ? "Platform control" : cafeName}</div></div>
        <div className="flex items-center gap-2"><Link href="/" className="hidden rounded-xl px-3 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--soft)] sm:block">View site</Link><span className="hidden max-w-[220px] truncate rounded-full bg-[var(--soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--brown)] lg:block">{cafeName}</span><form action="/api/auth/logout" method="post"><button className="icon-btn" aria-label="Log out" title="Log out"><LogOut size={17}/></button></form></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1500px] md:grid-cols-[250px_1fr]">
      <aside className="hidden min-h-[calc(100vh-64px)] border-r border-[var(--line)] p-4 md:block">
        <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-[.18em] text-[var(--muted)]">{superAdmin ? "Platform control" : "Your workspace"}</div>
        <nav className="grid gap-1">{links.map(([label, href, Icon]) => { const active=href==="/admin"?pathname===href:pathname.startsWith(href); return <Link key={href} href={href} className={`nav-link ${active?"active":""}`}><Icon size={17}/><span>{label}</span>{active&&<ChevronRight className="ml-auto opacity-50" size={15}/>}</Link>})}</nav>
        {!superAdmin && <div className="mt-8 rounded-3xl bg-[var(--brown)] p-5 text-white"><div className="text-[10px] font-black uppercase tracking-widest text-white/45">Your goal</div><div className="mt-2 text-base font-black">More repeat visits.</div><div className="mt-2 text-xs leading-5 text-white/60">Use loyalty, offers and campaigns to bring customers back — without making your team learn a complicated system.</div><Link href="/admin/qr" className="mt-4 inline-flex text-xs font-black text-[#f1c56d]">Open QR setup →</Link></div>}
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--card)]/95 px-2 py-2 backdrop-blur-xl md:hidden">{links.slice(0,5).map(([label,href,Icon])=>{const active=href==="/admin"?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={`mobile-nav ${active?"active":""}`}><Icon size={18}/><span>{label}</span></Link>})}</nav>
  </div>;
}
