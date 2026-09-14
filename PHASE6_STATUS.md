# CafeClub Phase 6 — Analytics & Business Intelligence

Implemented:
- Café analytics dashboard at `/admin/analytics`.
- 7/30/90-day analytics range.
- Revenue, orders, average order value and retention KPIs.
- Daily revenue trend visualization with CSS bars; no chart dependency.
- Customer health: total, repeat, new customers and average customer lifetime spend.
- Points/stamps issued and reward redemption metrics.
- Top customers for the selected period.
- Reward performance for the selected period.
- Campaign delivery summary.
- Email sent/failed counts.
- Super-admin platform analytics at `/admin/platform-analytics`.
- Platform café, subscription, estimated MRR, customer and transaction metrics.
- Plan mix and subscription health.
- Analytics added to café navigation.

Notes:
- Analytics are derived from current database records; no fake/demo metrics are generated.
- Revenue means recorded café order transactions, not SaaS subscription revenue.
- Estimated MRR is based on current subscription-to-plan assignments and is not a Stripe ledger.
- Production-scale analytics should later move expensive historical aggregations to scheduled rollups/materialized tables.
- Full dependency install/build could not be completed in the build environment because `npm install` timed out.
