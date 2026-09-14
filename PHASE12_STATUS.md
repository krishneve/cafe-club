# CafeClub Phase 12 — Membership & Customer Lifecycle

Implemented on top of Phase 11.

## Added
- Membership enrollment records with PENDING, ACTIVE, EXPIRED and CANCELED lifecycle states.
- One current membership per customer per café with tenant-scoped uniqueness.
- Free membership activation.
- Paid membership checkout through Stripe when Stripe is configured.
- Stripe webhook activation after successful membership checkout.
- Membership expiry synchronization on customer access and daily cron.
- Owner membership configuration UI with name, price, duration, benefits and active toggle.
- Owner membership status counters.
- Customer membership wallet with active-until date, join/cancel actions and payment state messaging.
- Membership database indexes for lifecycle queries.

## Security
- Customer operations require the customer session and café/customer match.
- Owner configuration requires owner permission.
- Membership Stripe metadata includes café and customer IDs and activation is server-side through the verified webhook.

## Validation
The environment used for implementation does not have the project dependencies installed and `npx prisma validate` timed out, so a full Next.js/Prisma build should be run after `npm install` in a normal networked environment.
