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
- `subscriptions/google-play`: Google Play Billing endpoints (owner-auth only where applicable)
  - `POST /api/subscriptions/google-play/verify` – verifies purchase tokens with Google; updates `libraries` and acknowledges
  - `POST /api/subscriptions/google-play/webhook` – optional Pub/Sub push handler for renewals/cancellations/expirations
  - `GET /api/subscriptions/google-play/health` – sanity check for service account/auth (owner-auth)

## Data Storage
- PostgreSQL schema (migrations in `Backend/migrations`), including (non-exhaustive):
  - `libraries` (tenants), `users` (staff/admin), `students`, `branches`, `schedules`, `seats`,
    `transactions`, `collections`, `advance_payments`, `expenses`, `products`, `lockers`,
    `announcements`, `queries`, and hostel-related tables
- Many tables are expected to include a `library_id` to enforce data isolation
  - Libraries table also includes Google Play fields (migration `010_add_google_play_fields.sql`):
    - `google_play_purchase_token` (TEXT), `google_play_product_id` (VARCHAR), `google_play_subscription_id` (VARCHAR)

## Integrations
- Cloudinary: image uploads (multer memory storage, 200KB limit, image mimetypes)
- Razorpay: subscription payments (env-configured; currently HIDDEN on web UI but preserved; setup guide in `Backend/SETUP_INSTRUCTIONS.md`)
- Google Play Billing (Android/Cordova): subscriptions via `cordova-plugin-purchase@^13`
  - Frontend uses a `GooglePlaySubscription` component for purchase flow
  - Backend verifies with Google Play Developer API (googleapis) and acknowledges purchases
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
  - Subscription page (`SubscriptionPlans.tsx`):
    - Cordova: renders `GooglePlaySubscription` (uses `window.CdvPurchase`)
    - Web: shows an informational card – subscriptions are managed in the mobile app
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
  - Google Play Billing via `cordova-plugin-purchase` requires Billing permission in AndroidManifest
  - Ensure `<uses-permission android:name="com.android.vending.BILLING" />` is present (plugin may auto-add)
  - Recommended Android minSdkVersion ≥ 24 (config currently sets 23; upgrade when convenient)

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
  - Google Play Billing (Backend):
    - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (inline JSON with escaped newlines in `private_key`) OR `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`
    - `GOOGLE_PLAY_PACKAGE_NAME` (e.g., `com.havenn.studyspace` from `havenn/config.xml`)
    - `GOOGLE_PLAY_PRODUCT_ID` (subscription Product ID)
  - Google Play Billing (Frontend):
    - Vite: `VITE_GOOGLE_PLAY_PRODUCT_ID` (used by `GooglePlaySubscription`)
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
- Migrations: `Backend/migrations/*`
- Frontend entry: `Frontend/src/App.tsx`
- Auth state: `Frontend/src/context/AuthContext.tsx`
- Cordova config: `havenn/config.xml`
