# CafeClub Production Launch Gate

This release is feature-frozen. The goal is to deploy the existing product safely, not add more features.

## Required infrastructure
- Managed PostgreSQL (Neon or equivalent) with automated backups/PITR.
- Vercel (or equivalent HTTPS host).
- Stripe live account with Starter/Growth/Pro recurring prices and webhook.
- Resend verified sending domain.
- Upstash Redis REST credentials for distributed rate limiting.

## Pre-release commands
```bash
npm ci
npm run predeploy
npm run typecheck
npm run build
```

If there is no committed lockfile yet, run `npm install` once in the repository, review the generated `package-lock.json`, commit it, and use `npm ci` for repeatable deployments.

## Database
Do not use `prisma db push` against production. Generate and review a baseline migration from the final Prisma schema, apply it to staging with `prisma migrate deploy`, then apply the same migration to production.

## Environment
Set all variables from `.env.example`. Production validation additionally requires:
- `NEXT_PUBLIC_APP_URL` using the final HTTPS origin
- `SESSION_SECRET` >= 32 random characters
- `CRON_SECRET` >= 16 random characters
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Resend API key + verified `EMAIL_FROM`
- Stripe secret + webhook secret + all three plan price IDs

## Smoke test
1. `/api/health` -> 200.
2. `/api/readiness` -> 200 and no secret/configuration details exposed.
3. Owner OTP login.
4. Manager and cashier permission checks.
5. Customer OTP login and café isolation.
6. POS order -> loyalty -> referral/reward effects.
7. Offer validation and redemption.
8. Membership checkout and Stripe webhook activation.
9. Stripe failed-payment/cancellation events.
10. Resend OTP/campaign/automation delivery.
11. Both cron endpoints with the configured secret.
12. Verify database backups/PITR and restore procedure.

## Release decision
Only mark the deployment production-ready after the clean-install build, reviewed migration, staging smoke test and live integration tests all pass.
