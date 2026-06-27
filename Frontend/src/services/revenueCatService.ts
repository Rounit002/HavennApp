/**
 * revenueCatService.ts
 * -----------------------------------------------------------------------------
 * Reusable RevenueCat + Google Play Billing service for the Havenn Cordova app.
 *
 * RevenueCat is ONLY used inside the Cordova Android WebView. On the web build
 * the SDK is never touched (the cordova-injected `window.Purchases` global does
 * not exist there). All public methods are written defensively so importing this
 * file on the web is completely safe.
 *
 * Responsibilities:
 *  - Configure the RevenueCat SDK with the Android public SDK key
 *  - Identify the logged-in user (logIn / logOut) so entitlements survive
 *    reinstall + restore and are tied to the correct library/owner
 *  - Fetch dynamic offerings from the RevenueCat dashboard
 *  - Purchase a package
 *  - Restore previous purchases
 *  - Read the customer info / premium entitlement status
 *  - Broadcast customer-info updates to listeners (real-time unlock)
 *
 * The RevenueCat Cordova plugin (`cordova-plugin-purchases`) exposes a global
 * `window.Purchases` class with callback-based static methods. This module wraps
 * those callbacks in Promises for ergonomic async/await usage in React.
 * -----------------------------------------------------------------------------
 */

import { isCordova, onCordovaReady } from '../utils/platformUtils';

/* -------------------------------------------------------------------------- */
/*  Minimal RevenueCat type definitions                                        */
/*  (We declare only what we use instead of bundling the deprecated npm types) */
/* -------------------------------------------------------------------------- */

export interface RCIntroPrice {
  price: number;
  priceString: string;
  period: string; // ISO 8601 duration, e.g. "P1W"
  cycles: number;
  periodUnit: string; // DAY | WEEK | MONTH | YEAR
  periodNumberOfUnits: number;
}

export interface RCStoreProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string; // localized, e.g. "₹299.00"
  currencyCode: string;
  /** ISO 8601 subscription period, e.g. "P1M", "P1Y" (Android subscriptions). */
  subscriptionPeriod?: string | null;
  /** Free trial / introductory pricing, when configured in Play Console. */
  introPrice?: RCIntroPrice | null;
}

export type RCPackageType =
  | 'UNKNOWN'
  | 'CUSTOM'
  | 'LIFETIME'
  | 'ANNUAL'
  | 'SIX_MONTH'
  | 'THREE_MONTH'
  | 'TWO_MONTH'
  | 'MONTHLY'
  | 'WEEKLY';

export interface RCPackage {
  identifier: string;
  packageType: RCPackageType;
  product: RCStoreProduct;
  offeringIdentifier: string;
}

export interface RCOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: RCPackage[];
  lifetime?: RCPackage | null;
  annual?: RCPackage | null;
  monthly?: RCPackage | null;
  weekly?: RCPackage | null;
}

export interface RCOfferings {
  current: RCOffering | null;
  all: { [identifier: string]: RCOffering };
}

export interface RCEntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  latestPurchaseDate: string;
  originalPurchaseDate: string;
  expirationDate: string | null;
  productIdentifier: string;
  isSandbox: boolean;
  store: string;
}

export interface RCCustomerInfo {
  entitlements: {
    all: { [key: string]: RCEntitlementInfo };
    active: { [key: string]: RCEntitlementInfo };
  };
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  originalAppUserId: string;
  managementURL: string | null;
}

export interface RCError {
  code: number;
  message: string;
  underlyingErrorMessage?: string;
  readableErrorCode?: string;
}

export interface RCPurchaseResult {
  productIdentifier: string;
  customerInfo: RCCustomerInfo;
}

export interface RCLogInResult {
  customerInfo: RCCustomerInfo;
  created: boolean;
}

/** Shape of the cordova-injected `window.Purchases` global we depend on. */
interface PurchasesGlobal {
  LOG_LEVEL: { VERBOSE: string; DEBUG: string; INFO: string; WARN: string; ERROR: string };
  setLogLevel(level: string): void;
  configureWith(config: { apiKey: string; appUserID?: string | null }): void;
  getOfferings(cb: (o: RCOfferings) => void, err: (e: RCError) => void): void;
  purchasePackage(
    pkg: RCPackage,
    cb: (r: RCPurchaseResult) => void,
    err: (e: { error: RCError; userCancelled: boolean }) => void,
  ): void;
  restorePurchases(cb: (info: RCCustomerInfo) => void, err: (e: RCError) => void): void;
  getCustomerInfo(cb: (info: RCCustomerInfo) => void, err: (e: RCError) => void): void;
  logIn(appUserID: string, cb: (r: RCLogInResult) => void, err: (e: RCError) => void): void;
  logOut(cb: (info: RCCustomerInfo) => void, err: (e: RCError) => void): void;
  getAppUserID(cb: (id: string) => void): void;
}

declare global {
  interface Window {
    Purchases?: PurchasesGlobal;
  }
}

/* -------------------------------------------------------------------------- */
/*  Configuration (environment driven)                                         */
/* -------------------------------------------------------------------------- */

// Android PUBLIC SDK key from the RevenueCat dashboard (starts with "goog_", or
// "test_" for the RevenueCat Test Store).
//
// IMPORTANT: these MUST be written as the exact member expression
// `import.meta.env.VITE_*`. Vite statically replaces that literal pattern at build
// time. Wrapping it (e.g. `(import.meta as any)?.env?.VITE_*`) defeats the static
// replacement, leaving a runtime `import.meta.env` lookup that is `undefined` in a
// production bundle — so the value silently becomes ''.
const REVENUECAT_ANDROID_API_KEY: string =
  import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || '';

// The entitlement identifier configured in RevenueCat (e.g. "premium").
export const ENTITLEMENT_ID: string =
  import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';

// Optional: force a specific offering instead of the "current" one.
const FORCED_OFFERING_ID: string =
  import.meta.env.VITE_REVENUECAT_OFFERING_ID || '';

/* -------------------------------------------------------------------------- */
/*  Internal state                                                             */
/* -------------------------------------------------------------------------- */

let configured = false;
let configuring: Promise<void> | null = null;
let currentAppUserId: string | null = null;

type CustomerInfoListener = (info: RCCustomerInfo) => void;
const listeners = new Set<CustomerInfoListener>();
let windowListenerAttached = false;

/** Resolve the cordova-injected Purchases global (undefined on web). */
function getPurchases(): PurchasesGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.Purchases;
}

/** True only when RevenueCat can actually run (Cordova + plugin present + key set). */
export function isRevenueCatAvailable(): boolean {
  return isCordova && !!getPurchases() && !!REVENUECAT_ANDROID_API_KEY;
}

/**
 * Build a stable RevenueCat App User ID for an owner/library.
 * Using a deterministic id (instead of an anonymous one) is what allows
 * entitlements to be restored after reinstall and shared across devices.
 */
export function buildAppUserId(libraryId: string | number): string {
  return `havenn_${libraryId}`;
}

/* -------------------------------------------------------------------------- */
/*  Customer-info update fan-out                                               */
/* -------------------------------------------------------------------------- */

/**
 * The Cordova plugin fires a window event "onCustomerInfoUpdated" whenever the
 * subscription state changes (renewal, expiration, restore, etc.). We attach a
 * single window listener and re-fetch a clean CustomerInfo object, then notify
 * all registered React listeners.
 */
function ensureWindowListener(): void {
  if (windowListenerAttached || typeof window === 'undefined') return;
  windowListenerAttached = true;
  window.addEventListener('onCustomerInfoUpdated', () => {
    // Re-fetch to get a normalized object rather than relying on event shape.
    getCustomerInfo()
      .then((info) => listeners.forEach((l) => l(info)))
      .catch(() => {/* ignore transient fetch errors */});
  });
}

/** Subscribe to customer-info updates. Returns an unsubscribe function. */
export function addCustomerInfoUpdateListener(listener: CustomerInfoListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* -------------------------------------------------------------------------- */
/*  Core SDK lifecycle                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Configure the RevenueCat SDK exactly once. Safe to call multiple times and
 * safe to call on web (resolves immediately as a no-op).
 *
 * @param appUserId Optional stable user id to identify the customer at startup.
 */
export function configure(appUserId?: string | null): Promise<void> {
  if (!isCordova) return Promise.resolve();
  if (configured) return Promise.resolve();
  if (configuring) return configuring;

  configuring = new Promise<void>((resolve) => {
    // Wait for `deviceready` so the cordova plugin global is injected.
    onCordovaReady(() => {
      const Purchases = getPurchases();
      if (!Purchases || !REVENUECAT_ANDROID_API_KEY) {
        // Plugin missing or key not set – leave unconfigured but don't crash.
        configuring = null;
        resolve();
        return;
      }

      try {
        // Verbose logs only in dev builds to aid debugging with RevenueCat support.
        if (import.meta.env.DEV) {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        } else {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
        }

        Purchases.configureWith({
          apiKey: REVENUECAT_ANDROID_API_KEY,
          appUserID: appUserId || null, // null => RevenueCat anonymous id
        });

        currentAppUserId = appUserId || null;
        configured = true;
        ensureWindowListener();
      } catch (e) {
        // Configuration failure should not crash the app.
        // eslint-disable-next-line no-console
        console.error('[RevenueCat] configure failed:', e);
      } finally {
        configuring = null;
        resolve();
      }
    });
  });

  return configuring;
}

/**
 * Identify the current user with RevenueCat. Call after login once we know the
 * library/owner id. If already configured with a different id, this aliases the
 * anonymous purchases to the identified user.
 */
export function logIn(appUserId: string): Promise<RCCustomerInfo | null> {
  return new Promise((resolve, reject) => {
    if (!isCordova) return resolve(null);
    const Purchases = getPurchases();
    if (!Purchases) return resolve(null);
    if (currentAppUserId === appUserId) {
      // Already identified – just return current info.
      return getCustomerInfo().then(resolve).catch(reject);
    }
    Purchases.logIn(
      appUserId,
      (result) => {
        currentAppUserId = appUserId;
        resolve(result.customerInfo);
      },
      (err) => reject(err),
    );
  });
}

/** Clear the identified user (call on logout). */
export function logOut(): Promise<RCCustomerInfo | null> {
  return new Promise((resolve) => {
    if (!isCordova) return resolve(null);
    const Purchases = getPurchases();
    if (!Purchases) return resolve(null);
    Purchases.logOut(
      (info) => {
        currentAppUserId = null;
        resolve(info);
      },
      () => {
        // logOut throws for already-anonymous users – treat as success.
        currentAppUserId = null;
        resolve(null);
      },
    );
  });
}

/* -------------------------------------------------------------------------- */
/*  Offerings / purchasing / restoring                                         */
/* -------------------------------------------------------------------------- */

/**
 * Fetch the offerings configured in the RevenueCat dashboard.
 * Returns the offering to display (forced id > current > first available).
 */
export function getOfferings(): Promise<RCOffering | null> {
  return new Promise((resolve, reject) => {
    if (!isRevenueCatAvailable()) return resolve(null);
    const Purchases = getPurchases()!;
    Purchases.getOfferings(
      (offerings) => {
        let offering: RCOffering | null = null;
        if (FORCED_OFFERING_ID && offerings.all?.[FORCED_OFFERING_ID]) {
          offering = offerings.all[FORCED_OFFERING_ID];
        } else if (offerings.current) {
          offering = offerings.current;
        } else {
          const keys = Object.keys(offerings.all || {});
          offering = keys.length ? offerings.all[keys[0]] : null;
        }
        resolve(offering);
      },
      (err) => reject(err),
    );
  });
}

/**
 * Purchase a package. Resolves with the updated CustomerInfo on success.
 * Rejects with `{ userCancelled: boolean, error }` so callers can quietly
 * ignore user cancellations.
 */
export function purchasePackage(
  pkg: RCPackage,
): Promise<RCCustomerInfo> {
  return new Promise((resolve, reject) => {
    if (!isRevenueCatAvailable()) {
      return reject({ userCancelled: false, error: { code: -1, message: 'Purchases are only available in the Android app.' } });
    }
    const Purchases = getPurchases()!;
    Purchases.purchasePackage(
      pkg,
      (result) => resolve(result.customerInfo),
      ({ error, userCancelled }) => reject({ userCancelled, error }),
    );
  });
}

/** Restore previous purchases and return the refreshed CustomerInfo. */
export function restorePurchases(): Promise<RCCustomerInfo> {
  return new Promise((resolve, reject) => {
    if (!isRevenueCatAvailable()) {
      return reject({ code: -1, message: 'Restore is only available in the Android app.' });
    }
    const Purchases = getPurchases()!;
    Purchases.restorePurchases(
      (info) => resolve(info),
      (err) => reject(err),
    );
  });
}

/** Fetch the latest CustomerInfo (cached unless stale). */
export function getCustomerInfo(): Promise<RCCustomerInfo> {
  return new Promise((resolve, reject) => {
    if (!isRevenueCatAvailable()) {
      return reject({ code: -1, message: 'RevenueCat not available.' });
    }
    const Purchases = getPurchases()!;
    Purchases.getCustomerInfo(
      (info) => resolve(info),
      (err) => reject(err),
    );
  });
}

/* -------------------------------------------------------------------------- */
/*  Entitlement helpers                                                        */
/* -------------------------------------------------------------------------- */

/** True when the configured premium entitlement is active for this customer. */
export function hasPremiumEntitlement(info: RCCustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]);
}

/** Convenience: fetch customer info and return whether premium is active. */
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isRevenueCatAvailable()) return false;
  try {
    const info = await getCustomerInfo();
    return hasPremiumEntitlement(info);
  } catch {
    return false;
  }
}

export function getCurrentAppUserId(): string | null {
  return currentAppUserId;
}
