import { AdminShell } from "@/components/AdminShell";
import {requirePermission} from "@/lib/permissions";
import { db } from "@/lib/db";
export default async function Referrals(){
 const s=await requirePermission("REFERRALS"); const cafeId=s.user.cafeId!;
 const [rows,total,completed,pending,points]=await Promise.all([
  db.referral.findMany({where:{cafeId},include:{referrer:true,referred:true},orderBy:{createdAt:"desc"},take:100}),
  db.referral.count({where:{cafeId}}), db.referral.count({where:{cafeId,status:"COMPLETED"}}), db.referral.count({where:{cafeId,status:"PENDING"}}),
  db.referral.aggregate({where:{cafeId,status:"COMPLETED"},_sum:{rewardPoints:true}})
 ]);
 const rate=total?Math.round(completed/total*100):0;
 return <AdminShell><span className="badge">Growth loop</span><h1 className="mt-3 text-3xl font-black">Referrals that convert.</h1><p className="mt-1 muted">Track customer-led acquisition from invite through first order.</p>
 <div className="mt-6 grid gap-3 sm:grid-cols-4">{[["Total referrals",total],["Completed",completed],["Pending",pending],["Conversion",`${rate}%`]].map(([a,b])=><div className="card p-5" key={String(a)}><div className="text-xs font-black uppercase tracking-widest muted">{a}</div><div className="mt-2 text-2xl font-black">{b}</div></div>)}</div>
 <div className="card mt-5 p-5"><div className="text-xs font-black uppercase tracking-widest muted">Points unlocked</div><div className="mt-2 text-2xl font-black">{points._sum.rewardPoints||0}</div><div className="mt-1 text-sm muted">Reward points issued from completed referrals.</div></div>
 <div className="card mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[var(--cream)]"><tr><th className="p-4">Referrer</th><th className="p-4">Code</th><th className="p-4">Referred</th><th className="p-4">Reward</th><th className="p-4">Status</th></tr></thead><tbody>{rows.map(x=><tr className="border-t border-[var(--line)]" key={x.id}><td className="p-4 font-bold">{x.referrer.name||x.referrer.email}</td><td className="p-4 font-bold">{x.code}</td><td className="p-4">{x.referred?.name||x.referred?.email||"Pending"}</td><td className="p-4">{x.rewardPoints} pts</td><td className="p-4"><span className="badge">{x.status}</span></td></tr>)}</tbody></table>{!rows.length&&<div className="p-8 text-center muted">No referrals yet.</div>}</div>
 </AdminShell>;
}
