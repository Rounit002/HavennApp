# Havenn — Technical Architecture and Flow

## Overview
Havenn is a multi-tenant study space/library management platform consisting of:
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + TypeScript (SPA, HashRouter, React Query)
- Mobile: Cordova Android wrapper loading the web app with required runtime permissions

Tenancy is enforced per library using session-based auth and middleware-driven data isolation. The backend also serves the compiled frontend for web delivery.

## High-level Architecture
```
[React SPA (HashRouter)]  <--HTTP/Cookies-->  [Express API]  <-->  [PostgreSQL]
        |                                                |             \
        |                                                |              \-- [Background jobs / Emails]
        |                                                |
   [Cordova Android WebView]  -- same SPA -->  (CORS + session cookie)           
```

## Key Components
- Backend
  - Express server (`Backend/server.js`) with:
    - CORS configured for web and mobile (file://, null origins allowed)
    - `express-session` cookie with 30-day lifetime, SameSite=None/secure in production
    - PostgreSQL via `pg` Pool (supports DATABASE_URL or discrete DB_* envs)
    - Static serving of compiled frontend from `Backend/dist`
    - Route factories per domain (e.g., students, branches, transactions) with shared pool
    - Logging via `winston`
    - File uploads via `multer` to Cloudinary
  - Middlewares (from `routes/ownerAuth.js` and `routes/auth.js`):
    - `authenticateOwner`, `authenticateOwnerOrStaff`, `authenticateUser`, `authenticateAny`
    - `ensureDataIsolation` to set `req.libraryId` for owner/staff
    - Subscription gates: `updateOwnerSubscriptionInfo`, `validateSubscription`
- Frontend
  - React + TypeScript SPA (`Frontend/src/App.tsx`)
  - Hash-based routing for WebView compatibility
  - `AuthContext` maintains session, periodically checks status, and refreshes via `/auth/refresh`
  - React Query for server state, Toaster/HotToaster for notifications
- Mobile (Cordova)
  - `havenn/config.xml` defines app id, sdk prefs, permissions (camera, android permissions)
  - WebView loads hosted app (current `content src` points to hosted URL) and uses same API + session

## Authentication & Authorization
- Sessions stored server-side (default memory store; PG session table helper is present but disabled)
- Cookie: 30 days, secure and SameSite=None in production to support WebViews
- User types
  - Owner: registers and logs in via `/api/owner-auth/*` (stored in `req.session.owner`)
  - Staff/Admin: logs in via `/api/auth/login` with `library_code` (stored in `req.session.user`)
  - Student: authenticated via student routes (`/api/student-auth/*`)
- Permissions
  - Owners implicitly have all permissions
  - Admins have all permissions
  - Staff permissions checked via `checkPermission(s)` where applicable

## Multi-tenancy & Data Isolation
- `ensureDataIsolation` sets `req.libraryId` from session (owner.id or user.libraryId)
- All guarded routes use `authenticateOwnerOrStaff` + `ensureDataIsolation` and subscription validation
- Queries are expected to filter by `req.libraryId` ensuring per-library data segregation

## Primary Backend Modules (selected)
Mounted in `server.js` under `/api/*` with auth/data/subscription guards where noted:
- `owner-auth`: Owner registration, login/logout, status, forgot/reset password, delete-account
- `auth`: Staff/admin login/logout/status, permissions helpers, forgot/reset password
- `student-auth`: Student auth endpoints
- `owner-dashboard`: Dashboard metrics (guarded, subscription-validated)
- Core domains (guarded): `users`, `students`, `schedules`, `seats`, `branches`, `lockers`,
  `transactions`, `advance-payments`, `collections`, `expenses`, `reports`, hostels (`hostel/*`),
  `products`, `settings`
- Public/mixed: `announcements` (any authenticated), `queries`, `public-registration`, `admission-requests`
- `subscriptions`: Plan/status endpoints used by frontend to gate features
- `subscriptions/revenuecat`: Primary subscription integration (Android via Google Play, mounted at `/api/subscriptions/revenuecat`). RevenueCat is the source of truth for entitlements; the backend mirrors state onto the `libraries` table so `validateSubscription` keeps working.
  - `POST /api/subscriptions/revenuecat/sync` (owner-auth) – called by the app right after purchase/restore; fetches the subscriber record from the RevenueCat REST API and updates the DB immediately (no webhook wait). Also refreshes `req.session.owner` flags.
  - `POST /api/subscriptions/revenuecat/webhook` (server-to-server) – receives RevenueCat events (renewals/cancellations/expirations) and reconciles the DB; protected by a shared `Authorization` header; always returns 200 to avoid retry storms.
  - App User ID convention: `havenn_<libraryId>`, set by the frontend so events/subscriptions map back to the correct tenant.
- `subscriptions/google-play`: Legacy direct Google Play Billing endpoints (owner-auth where applicable), retained for reference/fallback but superseded by RevenueCat
  - `POST /api/subscriptions/google-play/verify` – verifies purchase tokens with Google; updates `libraries` and acknowledges
  - `POST /api/subscriptions/google-play/webhook` – optional Pub/Sub push handler for renewals/cancellations/expirations
  - `GET /api/subscriptions/google-play/health` – sanity check for service account/auth (owner-auth)

## Data Storage
- PostgreSQL schema (migrations in `Backend/migrations`), including (non-exhaustive):
  - `libraries` (tenants), `users` (staff/admin), `students`, `branches`, `schedules`, `seats`,
    `transactions`, `collections`, `advance_payments`, `expenses`, `products`, `lockers`,
    `announcements`, `queries`, and hostel-related tables
- Many tables are expected to include a `library_id` to enforce data isolation
  - Libraries table includes subscription/billing fields across migrations:
    - Google Play (legacy, migration `010_add_google_play_fields.sql`): `google_play_purchase_token` (TEXT), `google_play_product_id` (VARCHAR), `google_play_subscription_id` (VARCHAR)
    - RevenueCat (migration `011_add_revenuecat_fields.sql`, idempotent): `subscription_expires_at` (TIMESTAMPTZ, shared expiry used by both flows), `revenuecat_app_user_id` (VARCHAR, stores `havenn_<libraryId>`)
    - General gating columns kept in sync by the sync/webhook routes: `is_subscription_active`, `is_trial`, `subscription_status`, `subscription_plan`, `subscription_start_date`, `subscription_end_date`

## Integrations
- Cloudinary: image uploads (multer memory storage, 200KB limit, image mimetypes)
- Razorpay: subscription payments (env-configured; currently HIDDEN on web UI but preserved; setup guide in `Backend/SETUP_INSTRUCTIONS.md`)
- RevenueCat (Android/Cordova, PRIMARY subscription system): subscriptions via `cordova-plugin-purchases@^8.0.7`, which wraps the Google Play Billing client plus RevenueCat's backend (receipt validation, entitlements, restore)
  - Frontend `services/revenueCatService.ts` wraps the cordova-injected `window.Purchases` global (configureWith / getOfferings / purchasePackage / restorePurchases / logIn / logOut / getCustomerInfo + `onCustomerInfoUpdated` event) in Promises; all methods are no-ops on web
  - `context/RevenueCatContext.tsx` owns SDK lifecycle: configures + identifies the owner (Cordova only), derives `isPremium` from the active entitlement, exposes purchase/restore/openPaywall, and calls the backend `/subscriptions/revenuecat/sync` to reconcile server state
  - Backend `routes/revenueCatSubscriptions.js` verifies/reconciles via the RevenueCat REST API (`api.revenuecat.com`, native `https`) and mirrors entitlement state onto `libraries`
  - Replaced the legacy `cordova-plugin-purchase@^13` (removed — both plugins bundle a Google Play Billing client and cannot coexist / caused duplicate-class build failures)
- Google Play Billing (legacy direct integration): backend verifies with Google Play Developer API (googleapis) and acknowledges purchases; retained for reference but superseded by RevenueCat
- Brevo/Sendinblue: email notifications (e.g., membership expiration reminders)

## Background Jobs and Emails
- `utils/cronJobs.js`: cron registration (currently disabled by default in `server.js`)
- `utils/email.js`: `sendExpirationReminder` consumes Brevo template id from DB `settings`

## Frontend App Structure and Flows
- Routing highlights (`App.tsx`):
  - Public: `/`, `/owner-register`, `/owner-login`, `/student-login`, `/register/:libraryCode`, `/registration-status/:libraryCode?/:phone?`
  - Authenticated (ProtectedRoute): dashboard, students, attendance/QR, hostel, transactions, advanced payment, collections, expenses, profit-loss, products, lockers, announcements, admission-requests, subscription, branches, public-registration management
  - AdminRoute wraps owner/admin-only areas (e.g., user management)
- Auth lifecycle (`AuthContext`):
  - On load: check owner -> user -> student status endpoints; preserve session offline
  - Refresh: `/auth/refresh` keeps client in sync
  - Logout: calls appropriate backend route per user type; clears local storage; redirects to `/#/`

- Platform utilities and subscriptions UI:
  - `utils/platformUtils.ts` provides `isCordova`, `isWeb`, `getPlatform()`, and `onCordovaReady()`
  - `App.tsx` wraps the tree in `RevenueCatProvider` (inside `AuthProvider`) and mounts a global `<Paywall />` modal opened via `useRevenueCat().openPaywall()`
  - Premium gating: `useRevenueCat()` / `usePremium()` hooks expose `isPremium` + `isReady`
    - Cordova: derived from the active RevenueCat entitlement (`window.Purchases`)
    - Web: derived from the backend `is_subscription_active` flag (RevenueCat SDK is never loaded)
  - On logout, `AuthContext` calls `revenueCatService.logOut()` to clear the RevenueCat identity (Cordova only)
  - Razorpay UI is intentionally wrapped in `isWeb && false` and commented as HIDDEN for safe rollback

## Example Request Flows
- Owner Login
  1. POST `/api/owner-auth/login` with phone + password
  2. Server sets session cookie; `AuthContext` detects owner via `/owner-auth/status`
  3. Frontend optionally fetches `/subscriptions/status` to annotate session
- Staff/Admin Login
  1. POST `/api/auth/login` with username + password + `library_code`
  2. Server sets session; guarded routes use `req.session.user.libraryId`
- Protected API Call
  1. Browser sends cookie; CORS allows credentials
  2. Middlewares: `authenticateOwnerOrStaff` -> `ensureDataIsolation` -> `updateOwnerSubscriptionInfo` -> `validateSubscription`
  3. Route handler executes queries scoped by `req.libraryId`
- Public Registration & Admission
  - Public pages post to `/api/public-registration` and `/api/admission-requests`; admins process via protected pages

## Delivery Targets
- Web: Express serves SPA from `Backend/dist` with wildcard fallback to `dist/index.html`
- Mobile: Cordova Android (`havenn/config.xml`) loads the hosted SPA; camera permissions enabled; CORS configured to accept `file://` and `null` origins for WebView
  - In-app subscriptions via `cordova-plugin-purchases@^8.0.7` (RevenueCat); requires the Google Play Billing permission, declared in `config.xml` as `<uses-permission android:name="com.android.vending.BILLING" />`
  - App id `com.havenn.studyspace`; `content src` points to the hosted app (`https://havennapp.onrender.com`)
  - Android SDK levels: `minSdkVersion` 23, `targetSdkVersion` 35, `compileSdkVersion` 35; AndroidX enabled

## Error Handling & Logging
- Central error handler logs via `winston` and returns 500 JSON
- Startup DB connectivity test logs masked env details
- Pool and socket error events are captured and logged

## Configuration & Environment
- Required envs (examples):
  - Database: `DATABASE_URL` or `DB_USER/DB_HOST/DB_NAME/DB_PASSWORD/DB_PORT`
  - Server: `PORT`, `SESSION_SECRET`
  - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - RevenueCat (Backend — primary subscription system):
    - `REVENUECAT_SECRET_API_KEY` (v1 secret key, used for server-to-server subscriber lookups; must stay private)
    - `REVENUECAT_ENTITLEMENT_ID` (must match `VITE_REVENUECAT_ENTITLEMENT_ID`; defaults to `premium`)
    - `REVENUECAT_WEBHOOK_AUTH_HEADER` (shared secret expected in the webhook `Authorization` header; set the same value in RevenueCat → Integrations → Webhooks)
  - RevenueCat (Frontend — Cordova only):
    - `VITE_REVENUECAT_ANDROID_API_KEY` (public Android SDK key, starts with `goog_`; safe to ship)
    - `VITE_REVENUECAT_ENTITLEMENT_ID` (entitlement identifier; defaults to `premium`)
    - `VITE_REVENUECAT_OFFERING_ID` (optional; forces a specific offering, otherwise uses the "current" offering)
  - Google Play Billing (Backend — legacy/optional):
    - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (inline JSON with escaped newlines in `private_key`) OR `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`
    - `GOOGLE_PLAY_PACKAGE_NAME` (e.g., `com.havenn.studyspace` from `havenn/config.xml`)
    - `GOOGLE_PLAY_PRODUCT_ID` (subscription Product ID)
    - `GOOGLE_PLAY_WEBHOOK_TOKEN` (optional shared secret for Pub/Sub push auth)
  - Google Play Billing (Frontend — legacy):
    - `VITE_GOOGLE_PLAY_PRODUCT_ID` (kept for reference)
  - Email: `BREVO_API_KEY`, `BREVO_TEMPLATE_ID`
- CORS: explicit allowlist includes production URLs, localhost dev ports, and mobile WebView origins

## Local Development
- Backend
  - Set env vars or `.env` in `Backend/` per `SETUP_INSTRUCTIONS.md`
  - Start: `node server.js` (or nodemon) from `Backend/`
- Frontend
  - Develop with your chosen dev server; final build artifacts must be copied to `Backend/dist` for web serving
- Mobile
  - Cordova Android uses `havenn/` with `config.xml`; ensure content source and permissions as needed

## Deployment Notes
- Backend can run on platforms like Railway/Render; use `DATABASE_URL` with SSL
- Ensure session cookie settings (secure/None) when behind HTTPS
- Build frontend and deploy artifacts to `Backend/dist` (or adjust static path if deploying separately)

## Security Considerations
- Always scope queries by `req.libraryId`
- Use hashed passwords for all user types (owners already use bcrypt; staff currently plain text in code sample — migrate to bcrypt)
- Validate and sanitize all inputs at route level
- Limit upload sizes and validate mimetypes (already enforced)
- Rotate and protect secrets; never commit `.env`

## Appendix: Notable Paths
- Server entry: `Backend/server.js`
- Route modules: `Backend/routes/*`
  - RevenueCat: `Backend/routes/revenueCatSubscriptions.js`
  - Google Play (legacy): `Backend/routes/googlePlaySubscriptions.js`
- Migrations: `Backend/migrations/*` (latest: `011_add_revenuecat_fields.sql`)
- Frontend entry: `Frontend/src/App.tsx`
- Auth state: `Frontend/src/context/AuthContext.tsx`
- RevenueCat state: `Frontend/src/context/RevenueCatContext.tsx`
- RevenueCat service: `Frontend/src/services/revenueCatService.ts`
- Paywall modal: `Frontend/src/components/Paywall.tsx`
- Cordova config: `havenn/config.xml`
