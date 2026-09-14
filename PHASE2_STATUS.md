# CafeClub Phase 2 — SaaS onboarding foundation

Implemented in this build:
- Public SaaS landing page with clear owner CTA.
- Pricing page for Starter, Growth and Pro.
- Café self-service signup/onboarding.
- Tenant workspace created atomically with owner, trial subscription, feature defaults and membership config.
- Unique café slug validation.
- Signup rate limiting and same-origin protection.
- Owner/customer separation preserved through role + cafeId.
- Customer-facing mobile wallet remains available at `/c/[slug]`.

Not yet production-complete:
- Stripe Checkout/webhooks and production billing lifecycle still need implementation.
- Email delivery requires Resend configuration.
- Background jobs/automated campaigns still need a job runner.
- Full RBAC/staff management and final security penetration testing remain.
