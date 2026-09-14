# CafeClub Phase 5 — CRM + Retention Automation

## Implemented
- Customer segments: All, VIP, Inactive 30+, New 30 days, Birthdays next 7 days, 500+ points.
- `/admin/crm` segment dashboard with counts and retention playbook.
- Customer list filtering by segment via `/admin/customers?segment=...`.
- Campaign audience selection and audience metadata.
- Manual campaign dispatch endpoint scoped to the authenticated cafe.
- Resend email dispatch with `{{name}}` personalization.
- Simulation mode when `RESEND_API_KEY` is absent.
- NotificationLog records with SENT / FAILED / SIMULATED status.
- Campaign recipient count and last sent timestamp.
- Campaign email subject/body are cafe-scoped.
- No cross-cafe customer selection is possible through the campaign API.

## Deliberate production follow-up
- Scheduled jobs/cron should call the same segment engine for automatic birthday and win-back campaigns.
- A queue/background worker should be used for large recipient lists rather than holding an HTTP request open.
- WhatsApp/SMS are intentionally not included in this phase.
