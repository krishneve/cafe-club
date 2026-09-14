# CafeClub Phase 13 — Benefit & Lifecycle Engine

Implemented on top of Phase 12.

## Membership benefits
- Configurable automatic member discount percentage.
- Configurable bonus-points multiplier.
- Configurable members-only rewards.
- Member discount is applied automatically at POS checkout when no coupon is used; coupon discounts take precedence and do not stack.
- Bonus points are calculated from the post-discount amount and multiplied for active members.

## Member-only rewards
- Rewards can be marked Members only.
- Customer reward listing hides members-only rewards from non-members.
- Redemption API independently enforces active membership, preventing direct API bypass.

## Lifecycle
- Daily lifecycle cron expires active memberships whose expiry has passed.
- Customers receive an expiring-membership email reminder during the final 7 days (respecting email opt-out).
- Notification dedupe keys prevent duplicate same-day reminders.
- Expiry creates a loyalty activity entry.

## Cron
- `/api/cron/lifecycle`
- Vercel schedule: `15 2 * * *` (02:15 UTC / 07:45 IST).

## Validation note
Full Next.js production build requires dependencies installed in a networked environment. Existing security smoke tests should be run after install.
