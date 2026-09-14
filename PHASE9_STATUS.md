# CafeClub Phase 9 — Production Hardening

Implemented on top of Phase 8.

## Security / RBAC
- Centralized server-side permission enforcement for café APIs.
- Owner-only billing endpoints.
- Permission-aware admin navigation using a client-safe role matrix.
- Tenant-scoped audit log page at `/admin/audit`.
- Important order, campaign, reward and loyalty-setting actions are audited.
- Same-origin and JSON body-size checks on sensitive mutations.
- Short-window IP rate limits with `Retry-After` responses on high-risk mutations.

## Reliability
- Automation run creation handles concurrent cron/manual execution through the unique run key.
- Cron normalizes expired trials before selecting cafés to process.
- Added database indexes for common security, notification and audit queries.
- Fixed automation API key mismatch (`REWARD_READY`).

## Developer validation
- Added a dependency-free security smoke test script.
- `npm run test:security` checks tenant-scoped API patterns, permission guards, security helpers, cron authorization and sensitive routes.
- Full Next.js/Prisma build should still be run after `npm install` in a normal networked environment.
