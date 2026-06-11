# Project Context

## Purpose
Havenn helps study spaces and libraries manage memberships, attendance, seats, finances, and communication, with per-tenant data isolation.

## Personas
- Owner: creates the tenant, manages staff, billing, and high-level configuration
- Staff/Admin: operates daily tasks (admissions, payments, attendance)
- Student: registers, checks in/out, receives announcements

## High-Level Use Cases
- Owner/Admin authentication and session management
- Student onboarding (public registration + approval)
- Attendance via QR scanning and schedules
- Finance: transactions, advance payments, collections, expenses, reports
- Resource management: branches, seats, lockers, hostel
- Communication: announcements and queries
- Subscription gating via Google Play Billing (mobile app)

## Success Metrics (examples)
- Low support tickets for login and subscription issues
- Sub-100ms API p95 for core list/detail endpoints (in-region)
- Reduced manual reconciliations via accurate reports

## Constraints & Assumptions
- Multi-tenant isolation by `library_id` on all guarded operations
- Sessions via cookies; WebView requires `SameSite=None` + `secure` in production
- Mobile Android app uses Cordova WebView; subscriptions via Google Play Billing
- Images stored in Cloudinary; upload size and types restricted

## Risks
- Misconfigured CORS or cookies breaking WebView sessions
- Inconsistent `library_id` filters in queries
- Play billing token/state drift between client and server

## Glossary
- Tenant: A library or study space using the platform
- Owner: The tenant administrator
- Staff/Admin: Users operating within a tenant
- Student: End-user receiving services

See also: [ARCHITECTURE.md](../ARCHITECTURE.md) and [docs/DESIGN.md](DESIGN.md).
