# Technical Design

This document captures design decisions, invariants, and conventions that complement ARCHITECTURE.md.

## Goals and Non-Goals
- Goals: secure multi-tenancy, reliable session auth, predictable REST API, simple deployments.
- Non-goals: real-time sync, offline-first (beyond basic resilience), poly-database support.

## Core Invariants
- All authenticated, non-owner requests must be scoped by `library_id`.
- Owners have implicit full access to their tenant; students have limited scopes via dedicated routes.
- Sessions are cookie-based (30 days). In production, cookies are `secure` and `SameSite=None`.
- Uploads are image-only, <= 200KB, stored in Cloudinary.

## API Style
- RESTful endpoints grouped by domain under `/api/*`.
- Consistent response shape for errors: `{ message, error? }` with appropriate HTTP status.
- Request validation at route-level (types, ranges, required fields).
- Use middleware chain for auth -> data isolation -> subscription validation.

## Error Handling & Logging
- Central error handler logs via `winston` and returns generic 500 with message.
- Mask secrets in logs. Avoid logging PII unless necessary for audit.

## Data Model (high-level)
- Tenants: `libraries`
- Users: `users` (admin/staff), `owners`, `students`
- Operational: `schedules`, `seats`, `transactions`, `advance_payments`, `collections`, `expenses`, `announcements`, `products`, `lockers`, `hostel_*`
- Many tables include `library_id` for isolation; ensure indexes where queried frequently.

## Migrations & Schema
- Bootstrap with `schema/create_all_tables.sql`. Incremental changes live in `migrations/` and should be applied in order.
- Prefer idempotent SQL where possible. Include `IF NOT EXISTS` for tables, indexes, and constraints.

## Authentication & Authorization
- `express-session`; production should use a durable store (e.g., Postgres via `connect-pg-simple`).
- Middlewares: `authenticateOwner`, `authenticateOwnerOrStaff`, `authenticateUser`, `ensureDataIsolation`.
- Subscription gates: `updateOwnerSubscriptionInfo` then `validateSubscription` ahead of guarded routes.

## File Uploads
- `multer` memory storage + Cloudinary.
- Validate mimetypes and extensions; limit size.

## Integrations
- Google Play Billing for subscriptions (server verifies and acknowledges purchases).
- Brevo/Sendinblue for transactional emails.
- Cloudinary for media.

## Performance
- Use PG pool with sane timeouts; add indexes for hot paths (e.g., by `library_id`, foreign keys, search columns).
- Avoid N+1 query patterns in list endpoints; paginate when necessary.

## Testing (initial scope)
- Unit: utility functions and critical middlewares.
- Integration: selected route tests with an ephemeral DB.
- E2E: smoke tests for auth and core flows.

## Deployment
- Single-node Express serving SPA from `dist/` or deploy API + static files separately.
- Ensure SSL termination, `secure` cookies, and correct CORS allowlist.

## References
- See [ARCHITECTURE.md](../ARCHITECTURE.md) for full component overview and flows.
