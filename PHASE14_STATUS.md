# CafeClub Phase 14 — Production Certification Gate

Feature development is frozen. This phase hardens the existing product for launch rather than adding new customer-facing features.

## Implemented
- Distributed production rate limiting via Upstash Redis REST API; local development keeps the in-memory limiter.
- Production environment validation now requires distributed rate-limiting credentials.
- Cron secret comparison uses constant-time comparison.
- Daily maintenance removes expired sessions/OTPs and old processed/failed webhook events.
- Deployment readiness documentation now treats Prisma migrations, backups/PITR, staging validation, Stripe/Resend verification and readiness checks as release gates.

## Validation limitation
The build environment could not complete `npm install` within the available execution window, so the final Next.js build and Prisma client generation must be executed in a normal networked environment.

## Required before launch
1. Install dependencies cleanly.
2. Run `npm run predeploy`.
3. Run `npm run build`.
4. Generate/review the baseline Prisma migration and deploy it to staging with `prisma migrate deploy`.
5. Configure Upstash Redis, Neon/Postgres backups/PITR, Stripe and Resend.
6. Execute the staging smoke-test checklist.
7. Deploy and verify `/api/readiness`.
