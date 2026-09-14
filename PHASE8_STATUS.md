# CafeClub Phase 8 — Staff & Team Management

Implemented staff accounts with tenant-scoped role-based access groundwork.

## Added
- STAFF role in Prisma.
- StaffInvite model with hashed one-time invitation token and 7-day expiry.
- AuditLog model for invitation/role/sign-out events.
- Cashier and Manager staff roles.
- `/admin/team` owner team management UI.
- Staff invitation API with Resend email support when configured; development invite URL otherwise.
- Invitation acceptance at `/admin/team/accept?token=...`.
- Staff OTP login support.
- Permission matrix in `lib/permissions.ts`.
- Staff session sign-out across devices.
- Tenant-scoped staff lookup and invitation handling.

## Permissions
Cashier: POS, customers, orders.
Manager: POS, customers, orders, CRM, loyalty, rewards, campaigns, automations, referrals, feedback, menu, analytics, membership.
Owner/Super Admin: all.

## Important production note
Existing legacy APIs use `cafeAdmin()` and therefore now recognize STAFF as authenticated café users. Sensitive routes should progressively adopt `requirePermission()` (especially billing, settings, team, and configuration mutations) before production launch. The permission matrix is centralized and ready for that hardening pass.
