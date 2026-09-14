# CafeClub Deployment Readiness

## Before production
1. Copy `.env.example` to the deployment environment and set real values.
2. Use a managed PostgreSQL database with automated backups and point-in-time recovery.
3. Generate and review a Prisma migration from the final schema; deploy it with `prisma migrate deploy`.
4. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain.
5. Set a random `SESSION_SECRET` of at least 32 characters.
6. Configure Resend, verify the sender domain, and set `EMAIL_FROM`.
7. Create Stripe recurring prices for Starter, Growth and Pro; set all price IDs.
8. Create a Stripe webhook for `/api/billing/webhook` and set `STRIPE_WEBHOOK_SECRET`.
9. Set `CRON_SECRET`; verify the Vercel cron invokes `/api/cron/automations`.
10. Run `npm install`, `npm run predeploy`, `npx prisma generate`, and `npm run build`.
11. After deployment, verify `/api/health` returns 200 and `/api/readiness` returns 200.
12. Configure distributed rate limiting with Upstash Redis (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`); production startup validation intentionally fails without it.
13. Generate a baseline Prisma migration from the final schema before the first production deploy; do not use `db push` against production.
14. Test OTP login, owner/staff permissions, checkout, Stripe webhook delivery, POS, reward redemption and automation email in production-like conditions.

## Operational notes
- Never commit `.env` or provider secrets.
- Rotate secrets if they are ever exposed.
- Keep Stripe webhook handling enabled and monitor failed events.
- Use provider backups/PITR rather than relying on application-level exports.
- The app currently uses synchronous email sending for campaign/automation delivery; move to a queue/worker before very high volume.

## Phase 13 additions
- Run `npx prisma db push` (or create/apply a migration in a controlled production workflow) after installing dependencies to add membership benefit and member-only reward fields.
- Ensure `CRON_SECRET` is configured in Vercel so `/api/cron/lifecycle` is authorized.
- The lifecycle cron is scheduled at 02:15 UTC (07:45 IST).

## Phase 14 — Production certification gate

The application is feature-frozen. No new customer-facing features should be added before launch. Production is considered launch-ready only when:
- `npm run predeploy` passes in a clean install.
- `npm run build` passes.
- A reviewed Prisma migration is committed and `prisma migrate deploy` succeeds on a staging database.
- Upstash rate limiting is configured.
- Stripe test-mode checkout/webhooks pass end-to-end.
- Resend test delivery succeeds from the verified production domain.
- Staging smoke tests pass for owner, manager, cashier and customer flows.
- `/api/readiness` returns HTTP 200 in the deployed environment.
- Backups/PITR are enabled on the managed PostgreSQL provider.

The codebase now fails closed for distributed rate limiting in production rather than silently falling back to per-instance memory.
