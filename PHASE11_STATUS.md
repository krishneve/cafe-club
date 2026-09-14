# CafeClub Phase 11 — Advanced Offers & Engagement

Implemented:
- Tenant-scoped Offer and OfferRedemption models.
- Percentage, fixed-amount and free-item offer types.
- Minimum spend, maximum discount, usage limit and per-customer limits.
- Start/expiry windows and pause/resume controls.
- Café owner Offers Studio at `/admin/offers`.
- Customer active offers endpoint and wallet offers page at `/c/[slug]/offers`.
- POS transaction offer-code support with discount calculation, usage accounting and loyalty activity.
- Offer redemption is tenant-scoped and recorded against transactions.
- Audit events for offer creation/update.

Validation: security smoke test passes. Full Next.js build requires project dependencies installed in a normal networked environment.
