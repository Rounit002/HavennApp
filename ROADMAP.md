# Roadmap

This is a living document. Dates are indicative; refine as you prioritize.

## Now (stabilization)
- [ ] Subscription flow hardening (Google Play Billing end-to-end, error retries, receipt state sync)
- [ ] Strengthen multi-tenancy guardrails (audit all routes for `library_id` scoping)
- [ ] Migrate staff credentials to hashed passwords (bcrypt) with safe rollout path
- [ ] Add PG session store in production and session table migration

## Next
- [ ] Reporting enhancements (owner dashboard KPIs, export CSV/PDF)
- [ ] Improve offline/low-connectivity experience in WebView (optimistic UI for scans)
- [ ] E2E smoke tests for critical flows (auth, students, transactions)
- [ ] Admin settings for email templates and subscription messaging

## Later
- [ ] PWA build and install prompts for web delivery
- [ ] Data lifecycle tools (backup/export per tenant, redaction, deletion)
- [ ] Performance: add/verify indexes for hot queries; slow query logging
- [ ] Accessibility audit and improvements (WCAG AA targets)

## Done (historical)
- [x] Cordova Android wrapper with Google Play Billing integration
- [x] Web SPA served by Express with proper CORS for WebView and web

Contributions: Propose items via PR; keep this file in sync with delivery plans.
