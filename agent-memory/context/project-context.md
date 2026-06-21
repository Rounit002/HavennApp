# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning where applicable.

## [Unreleased]
- 

## 2026-06-21
### Changed
- Updated `ARCHITECTURE.md` to reflect the RevenueCat migration: documented
  `/api/subscriptions/revenuecat` sync + webhook routes, the
  `RevenueCatContext`/`revenueCatService`/`Paywall` frontend wiring,
  `cordova-plugin-purchases@^8.0.7` (replacing the removed legacy
  `cordova-plugin-purchase@^13`), migration `011_add_revenuecat_fields.sql`
  (`subscription_expires_at`, `revenuecat_app_user_id`), new backend/frontend
  RevenueCat env vars, and demoted the direct Google Play Billing integration
  to legacy. Refreshed Cordova SDK levels (min 23 / target 35 / compile 35).
- RevenueCat (cordova-plugin-purchases v8) integration verified end-to-end against
  the installed plugin's actual API (window.Purchases clobber, configureWith,
  getOfferings/purchasePackage/restorePurchases/logIn/logOut/getCustomerInfo,
  onCustomerInfoUpdated event). Service/context/paywall/backend routes all match.
### Removed
- Removed conflicting legacy `cordova-plugin-purchase` (v13) from the Cordova app.
  It bundled a second Google Play Billing client and could not coexist with
  cordova-plugin-purchases (duplicate-class build failure). Removed from
  package.json, plugins/, and the android platform via `cordova plugin rm`.

## 2026-06-08
### Added
- Initial documentation set:
  - README.md
  - ROADMAP.md
  - CHANGELOG.md
  - docs/CONTEXT.md
  - docs/DESIGN.md
  - docs/UI_UX_DESIGN.md

<!-- imported from CHANGELOG.md by Agentry -->

## 2026-06-21 — Wired navbar "Upgrade" button to RevenueCat paywall
- File edited: `Frontend/src/components/Navbar.tsx`.
- Removed duplicated platform branch in old `handleUpgrade` (`isCordova ? openPaywall() : navigate('/subscription')`). Button now always calls `useRevenueCat().openPaywall()`; all platform branching stays in RevenueCatContext/Paywall.
- Destructured `{ openPaywall, isPremium, isReady }`. Button disabled + spinner ("Loading...") while `!isReady`.
- `showUpgradeButton` now `user?.role === 'admin' && (!isPremium || user?.is_trial)` (was `!is_subscription_active || is_trial`). Trial users still see CTA; premium non-trial users see no CTA (green active-subscription banner already covers them).
- Removed unused `useNavigate`/`navigate` and unused `User` icon import; added `Loader2`.
- FOLLOW-UP / FLAGGED: `PaywallContent.tsx` has NO web-specific copy. On web, offerings never load, so the modal shows the generic empty state "No subscription plans are available right now." instead of a "subscribe via the Android app" message. Needs product copy decision.

## 2026-06-21 (follow-up) — Added web-specific paywall copy
- File edited: `Frontend/src/components/PaywallContent.tsx`.
- Added an `isWeb` branch (after the `isPremium` block, before loading/offerings) that shows a "Subscribe in the Havenn app" message + a "Get the Android app" button linking to the Play Store (`com.havenn.studyspace`). Replaces the previous generic "No subscription plans available" empty state on web.
- Premium web users still see "You're Premium" first; no SDK calls added on web.
