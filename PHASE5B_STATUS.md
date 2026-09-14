# CafeClub Phase 5B — Automation Engine

Implemented:
- Birthday, 30-day win-back, first-order follow-up and reward-ready automations.
- Per-café automation ON/OFF settings.
- Daily idempotent automation runs.
- Customer email opt-out support.
- Personalized email templates using `{{name}}` and `{{cafe}}`.
- Notification logs with status, body and dedupe keys.
- Automation history API and owner UI at `/admin/automations`.
- Manual “Run now” controls for testing.
- Scheduled Vercel cron endpoint at `/api/cron/automations`.
- CRON_SECRET protection for the scheduler endpoint.
- Tenant-scoped automation queries.
- Development-mode email simulation when Resend is not configured.

Production notes:
- Configure RESEND_API_KEY and EMAIL_FROM for real email delivery.
- Configure CRON_SECRET in the deployment environment.
- Vercel cron executes the automation endpoint daily at 08:00 UTC; for an India-first deployment, adjust the schedule if the desired local time differs.
- Before launch, add a proper queue/worker if campaign volume grows beyond the current batch limit.
