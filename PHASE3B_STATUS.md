# CafeClub Phase 3B — Menu, Loyalty, Rewards

Implemented in this build:
- Café menu database model and tenant-scoped menu APIs.
- Menu manager UI with categories, prices, enable/disable and delete.
- POS now loads active menu items from the café database instead of a hardcoded catalog.
- Transaction model stores payment method.
- Central loyalty calculation helper.
- Loyalty settings UI for points and stamps plus game toggles.
- Reward creation supports stock limits.
- Reward redemption decrements finite stock atomically and records loyalty activity.
- Order completion records loyalty activity and stamp-card completion activity.
- Customer history now shows a loyalty activity timeline and order history.
- Customer and café queries remain scoped to the authenticated café.

Not yet production-complete:
- Automated campaigns/email delivery.
- Full POS product editing/variants/taxes/discounts/refunds.
- Staff RBAC.
- Real subscription billing/webhooks.
- Automated tests and CI.
- Production build could not be validated in the build environment because npm dependency installation timed out.
