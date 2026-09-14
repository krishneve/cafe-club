# CafeClub Phase 7 — Customer Growth & Engagement

Implemented on top of Phase 6.

## Included
- Referral claim flow for signed-in customers.
- Tenant-scoped referral validation; customers cannot attach their own code.
- Referral lifecycle: PENDING -> COMPLETED on the referred customer's first recorded café order.
- Configured referral reward points are awarded to both referrer and referred customer when the first order completes.
- Loyalty activities record referral rewards for both sides.
- Customer referral page now shows personal code and lets an invited customer attach a friend's code.
- Admin referral dashboard now shows totals, completed/pending referrals, conversion rate and points unlocked.
- Redemption records now carry a 30-day expiry timestamp for future fulfillment/expiry UX.

## Security
- Referral APIs use customerSession and cafeId scoping.
- Referrer code must belong to the same café.
- Self-referrals and duplicate referral attachment are blocked.
- Transaction completion is performed in the same database transaction as the order and loyalty updates.

## Validation note
Dependencies were not installed in the build environment, so a full `npm run build` could not be completed here. Run `npm install`, `npx prisma generate`, `npx prisma db push`, then `npm run build` locally/CI.
