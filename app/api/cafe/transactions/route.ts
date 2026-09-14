import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {assertSameOrigin, safeJson, clientKey, rateLimit, rateLimitResponse, assertJsonBody } from "@/lib/security";
import { audit } from "@/lib/audit";

const schema = z.object({
  customerId: z.string().cuid().optional(),
  email: z.string().email().max(254).optional(),
  name: z.string().trim().max(120).optional(),
  amount: z.number().positive().max(1000000),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "OTHER"]).default("CASH"),
  offerCode: z.string().trim().max(32).optional(),
  items: z.array(z.object({ name: z.string().trim().min(1).max(120), qty: z.number().int().positive().max(100), price: z.number().nonnegative().max(1000000) })).default([]),
}).refine(v => Boolean(v.customerId || v.email), { message: "Customer is required." });

export async function GET() {
  try {
    const s = await requirePermission("ORDERS");
    if (!s.user.cafeId) return NextResponse.json([]);
    return NextResponse.json(await db.transaction.findMany({
      where: { cafeId: s.user.cafeId },
      include: { customer: true }, orderBy: { createdAt: "desc" }, take: 300,
    }));
  } catch { return NextResponse.json({ error: "Unauthorized." }, { status: 401 }); }
}

export async function POST(req: Request) {
  if (!assertJsonBody(req)) return rateLimitResponse(60, "Request body is invalid or too large.");
  const rl = await rateLimit(clientKey(req, "transactions"), 20, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const s = await requirePermission("POS");
    const cafeId = s.user.cafeId;
    if (!cafeId) return NextResponse.json({ error: "No café assigned." }, { status: 400 });
    const b = schema.parse(await req.json());
    const cafe = await db.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) return NextResponse.json({ error: "Café not found." }, { status: 404 });

    const pf = await db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "LOYALTY_POINTS" } } });
    const sf = await db.cafeFeature.findUnique({ where: { cafeId_feature: { cafeId, feature: "STAMP_CARD" } } });
    const pc = safeJson<{ pointsPerRupee?: number; minOrder?: number }>(pf?.configJson || "{}", {});
    const sc = safeJson<{ stampsPerOrder?: number; stampsToReward?: number }>(sf?.configJson || "{}", {});
    let offer:any=null; let discountAmount=0;
    if(b.offerCode){
      offer=await db.offer.findFirst({where:{cafeId,code:b.offerCode.toUpperCase(),active:true}});
      const now=new Date();
      if(!offer || (offer.startsAt&&offer.startsAt>now) || (offer.expiresAt&&offer.expiresAt<=now) || (offer.usageLimit!==null&&offer.usageCount>=offer.usageLimit)) return NextResponse.json({error:"Offer is unavailable or expired."},{status:400});
    }
        if(offer && b.amount>=offer.minSpend){
      if(offer.type==="PERCENTAGE") discountAmount=Math.min(b.amount*(Number(offer.value||0)/100),Number(offer.maxDiscount||Infinity));
      else if(offer.type==="FIXED_AMOUNT") discountAmount=Math.min(b.amount,Number(offer.value||0));
    }
    const stampsEarned = sf?.enabled ? Number(sc.stampsPerOrder || 1) : 0;

    let customer = b.customerId
      ? await db.customer.findFirst({ where: { id: b.customerId, cafeId } })
      : await db.customer.findUnique({ where: { cafeId_email: { cafeId, email: b.email!.toLowerCase() } } });

    if (b.customerId && !customer) return NextResponse.json({ error: "Customer does not belong to this café." }, { status: 403 });
    if (!customer) {
      customer = await db.customer.create({
        data: { cafeId, email: b.email!.toLowerCase(), name: b.name || null, referralCode: `${cafe.slug.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` },
      });
    } else if (b.name && !customer.name) {
      await db.customer.update({ where: { id: customer.id }, data: { name: b.name } });
    }
    if(offer){ const used=await db.offerRedemption.count({where:{offerId:offer.id,customerId:customer.id}}); if(used>=offer.perCustomerLimit)return NextResponse.json({error:"This customer has already used this offer."},{status:400}); }

    // Membership benefits apply automatically at checkout. A coupon takes precedence so discounts never stack.
    const membership = await db.membership.findUnique({ where: { cafeId_customerId: { cafeId, customerId: customer.id } }, include: { cafe: { select: { membership: true } } } });
    const activeMember = membership?.status === "ACTIVE" && (!membership.expiresAt || membership.expiresAt > new Date());
    const memberConfig = membership?.cafe.membership;
    const memberDiscount = activeMember && !offer && memberConfig ? Math.min(b.amount, b.amount * Math.max(0, Math.min(100, Number(memberConfig.memberDiscountPercent || 0))) / 100) : 0;
    if (memberDiscount > 0) discountAmount = memberDiscount;
    const netAmount = Math.max(0, b.amount - discountAmount);
    const basePoints = pf?.enabled && netAmount >= Number(pc.minOrder || 0) ? Math.floor(netAmount * Number(pc.pointsPerRupee || 0)) : 0;
    const membershipMultiplier = activeMember && memberConfig ? Math.max(1, Math.min(10, Number(memberConfig.bonusPointsMultiplier || 1))) : 1;
    const points = Math.floor(basePoints * membershipMultiplier);

    const stampTarget = Math.max(1, Number(sc.stampsToReward || 8));
    const before = customer.stamps;
    const afterRaw = before + stampsEarned;
    const completedCards = sf?.enabled ? Math.floor(afterRaw / stampTarget) : 0;
    const newStamps = sf?.enabled ? afterRaw % stampTarget : before;

    const result = await db.$transaction(async tx => {
      const transaction = await tx.transaction.create({
        data: {
          cafeId, customerId: customer!.id,
          orderNumber: `CC-${Date.now().toString().slice(-7)}`,
          amount: b.amount, itemsJson: JSON.stringify(b.items),
          offerId: offer?.id || null, discountAmount,
          pointsEarned: points, stampsEarned, paymentMethod: b.paymentMethod,
        },
      });
      const updated = await tx.customer.update({
        where: { id: customer!.id },
        data: { pointsBalance: { increment: points }, stamps: newStamps, visits: { increment: 1 }, totalSpend: { increment: b.amount }, lastVisitAt: new Date() },
      });
      await tx.loyaltyActivity.create({
        data: {
          cafeId, customerId: customer!.id, type: "ORDER", title: "Purchase completed",
          description: `${transaction.orderNumber} · ₹${b.amount.toLocaleString("en-IN")}${activeMember && memberDiscount > 0 ? ` · member saved ₹${memberDiscount.toLocaleString("en-IN")}` : ""}`,
          points, stamps: stampsEarned, metadataJson: JSON.stringify({ transactionId: transaction.id, paymentMethod: b.paymentMethod, membershipApplied: activeMember, memberDiscount, bonusPointsMultiplier: membershipMultiplier })
        }
      });
      if(offer){
        let consumed=true;
        if(offer.usageLimit!==null){const u=await tx.offer.updateMany({where:{id:offer.id,cafeId,usageCount:{lt:offer.usageLimit}},data:{usageCount:{increment:1}}});consumed=u.count===1;}
        else await tx.offer.update({where:{id:offer.id},data:{usageCount:{increment:1}}});
        if(!consumed) throw new Error("OFFER_LIMIT_REACHED");
        await tx.offerRedemption.create({data:{cafeId,offerId:offer.id,customerId:customer!.id,transactionId:transaction.id,discountAmount}});
        await tx.loyaltyActivity.create({data:{cafeId,customerId:customer!.id,type:"OFFER_REDEEMED",title:`Offer redeemed: ${offer.title}`,description:`${offer.code} · ₹${discountAmount.toLocaleString("en-IN")} saved`,points:0,stamps:0,metadataJson:JSON.stringify({offerId:offer.id,discountAmount})}});
      }
      if (completedCards > 0) {
        await tx.loyaltyActivity.create({
          data: { cafeId, customerId: customer!.id, type: "STAMP_REWARD", title: `${completedCards} stamp card${completedCards > 1 ? "s" : ""} completed`, description: "A stamp reward is ready to claim.", points: 0, stamps: 0 }
        });
      }

      // Complete one pending referral on the referred customer's first order.
      const referral = await tx.referral.findFirst({ where: { cafeId, referredId: customer!.id, status: "PENDING" } });
      if (referral) {
        const rewardPoints = Math.max(0, referral.rewardPoints);
        await tx.referral.update({ where: { id: referral.id }, data: { status: "COMPLETED" } });
        if (rewardPoints > 0) {
          await tx.customer.update({ where: { id: referral.referrerId }, data: { pointsBalance: { increment: rewardPoints } } });
          await tx.loyaltyActivity.create({ data: { cafeId, customerId: referral.referrerId, type: "REFERRAL_REWARD", title: "Referral reward unlocked", description: `Your friend completed their first order. +${rewardPoints} points`, points: rewardPoints, stamps: 0, metadataJson: JSON.stringify({ referralId: referral.id, referredCustomerId: customer!.id }) } });
          await tx.customer.update({ where: { id: customer!.id }, data: { pointsBalance: { increment: rewardPoints } } });
          await tx.loyaltyActivity.create({ data: { cafeId, customerId: customer!.id, type: "REFERRAL_WELCOME", title: "Referral welcome bonus", description: `Welcome bonus for joining through a referral. +${rewardPoints} points`, points: rewardPoints, stamps: 0, metadataJson: JSON.stringify({ referralId: referral.id }) } });
        }
      }
      const finalCustomer = await tx.customer.findUnique({ where: { id: customer!.id } });
      return { transaction, customer: finalCustomer! };
    });

    await audit(cafeId, s.user.id, "ORDER_COMPLETED", "Transaction", result.transaction.id, { amount: b.amount, paymentMethod: b.paymentMethod, customerId: result.customer.id });

    return NextResponse.json({
      message: "Order completed successfully.",
      orderNumber: result.transaction.orderNumber,
      pointsEarned: points,
      stampsEarned,
      newPointsBalance: result.customer.pointsBalance,
      newStamps: result.customer.stamps,
      completedCards,
      stampTarget,
      discountAmount, offerCode: offer?.code || null, membershipApplied: activeMember, memberDiscount, customer: { id: result.customer.id, name: result.customer.name, email: result.customer.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Enter valid order details." }, { status: 400 });
    console.error("transaction", error);
    return NextResponse.json({ error: "Unable to complete order." }, { status: 500 });
  }
}
