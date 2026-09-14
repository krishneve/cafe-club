import { AdminShell } from "@/components/AdminShell";
import { requireOwner } from "@/lib/permissions";
import { db } from "@/lib/db";

export default async function AuditPage() {
  const s = await requireOwner();
  const logs = await db.auditLog.findMany({
    where: { cafeId: s.user.cafeId! },
    include: { user: { select: { name: true, email: true, role: true, staffRole: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  const cafe = await db.cafe.findUnique({ where: { id: s.user.cafeId! }, select: { name: true } });
  return <AdminShell cafeName={cafe?.name || "Café"}>
    <span className="badge">Security & accountability</span>
    <h1 className="mt-3 text-3xl font-black sm:text-4xl">Audit log</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 muted">A café-scoped history of important owner and team actions. Sensitive data stays inside your workspace.</p>
    <div className="card mt-7 overflow-hidden">
      {logs.length === 0 ? <div className="p-10 text-center text-sm muted">No audited actions yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--soft)] text-[10px] uppercase tracking-wider muted"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Details</th></tr></thead><tbody>{logs.map(x=><tr className="border-t border-[var(--line)]" key={x.id}><td className="whitespace-nowrap px-5 py-4 text-xs muted">{x.createdAt.toLocaleString("en-IN")}</td><td className="px-5 py-4"><div className="font-bold">{x.user?.name || x.user?.email || "System"}</div><div className="text-[10px] uppercase muted">{x.user?.staffRole || x.user?.role || "SYSTEM"}</div></td><td className="px-5 py-4 font-black">{x.action.replaceAll("_", " ")}</td><td className="px-5 py-4 text-xs muted">{x.entity}{x.entityId ? ` · ${x.entityId.slice(0, 10)}` : ""}</td><td className="max-w-[320px] truncate px-5 py-4 font-mono text-[11px] muted">{x.metadataJson}</td></tr>)}</tbody></table></div>}
    </div>
  </AdminShell>;
}
