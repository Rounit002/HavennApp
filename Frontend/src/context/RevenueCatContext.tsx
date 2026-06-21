/**
 * RevenueCatContext.tsx
 * -----------------------------------------------------------------------------
 * App-wide provider that owns RevenueCat lifecycle and premium-access state.
 *
 * It:
 *  - Configures + identifies the user with RevenueCat when an owner is logged in
 *    (Cordova only).
 *  - Exposes `isPremium` derived from the active entitlement (Cordova) or from
 *    the backend subscription flag (web).
 *  - Listens for customer-info updates so premium unlocks/locks in real time and
 *    survives app restart + reinstall (after restore).
 *  - Provides purchase + restore helpers that also sync the result to the Havenn
 *    backend (so server-side feature gating stays in sync).
 *  - Manages the global Paywall modal visibility (openPaywall / closePaywall).
 * -----------------------------------------------------------------------------
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { isCordova } from '../utils/platformUtils';
import { authFetch } from '../utils/apiConfig';
import {
  addCustomerInfoUpdateListener,
  buildAppUserId,
  checkPremiumStatus,
  configure,
  getCustomerInfo,
  getOfferings,
  hasPremiumEntitlement,
  isRevenueCatAvailable,
  logIn as rcLogIn,
  purchasePackage as rcPurchasePackage,
  restorePurchases as rcRestorePurchases,
  RCCustomerInfo,
  RCOffering,
  RCPackage,
} from '../services/revenueCatService';

interface PurchaseOutcome {
  success: boolean;
  userCancelled?: boolean;
  isPremium?: boolean;
  message?: string;
}

interface RevenueCatContextType {
  /** SDK has finished its initial configuration/entitlement check. */
  isReady: boolean;
  /** Whether the user currently has premium access. */
  isPremium: boolean;
  /** The offering to display (dynamic, from the dashboard). */
  offering: RCOffering | null;
  isLoadingOfferings: boolean;
  offeringsError: string | null;
  /** Re-fetch offerings from RevenueCat. */
  reloadOfferings: () => Promise<void>;
  /** Re-check entitlement status from RevenueCat. */
  refreshCustomerInfo: () => Promise<void>;
  /** Purchase a package. Never throws – returns a structured outcome. */
  purchase: (pkg: RCPackage) => Promise<PurchaseOutcome>;
  /** Restore previous purchases. Never throws – returns a structured outcome. */
  restore: () => Promise<PurchaseOutcome>;
  /** Paywall modal control. */
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isReady: false,
  isPremium: false,
  offering: null,
  isLoadingOfferings: false,
  offeringsError: null,
  reloadOfferings: async () => {},
  refreshCustomerInfo: async () => {},
  purchase: async () => ({ success: false }),
  restore: async () => ({ success: false }),
  isPaywallOpen: false,
  openPaywall: () => {},
  closePaywall: () => {},
});

export const RevenueCatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [isReady, setIsReady] = useState(false);
  const [rcPremium, setRcPremium] = useState(false); // entitlement-based (Cordova)
  const [offering, setOffering] = useState<RCOffering | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const identifiedRef = useRef<string | null>(null);

  /**
   * Ask the backend to reconcile its subscription record with RevenueCat's
   * source of truth, then notify the rest of the app to refresh session state.
   * This keeps server-side feature gating in sync immediately after a purchase
   * (the RevenueCat webhook handles longer-term renewals/cancellations).
   */
  const syncBackend = useCallback(async () => {
    try {
      await authFetch('/subscriptions/revenuecat/sync', { method: 'POST' });
    } catch {
      // Non-fatal: the webhook will eventually reconcile server state.
    }
    try {
      (window as any).dispatchEvent(new Event('subscription:updated'));
    } catch {
      /* ignore */
    }
  }, []);

  /** Load the dynamic offering from RevenueCat. */
  const reloadOfferings = useCallback(async () => {
    if (!isRevenueCatAvailable()) return;
    setIsLoadingOfferings(true);
    setOfferingsError(null);
    try {
      const next = await getOfferings();
      setOffering(next);
      if (!next || next.availablePackages.length === 0) {
        setOfferingsError('No subscription plans are currently available. Please try again later.');
      }
    } catch (e: any) {
      setOfferingsError(e?.message || 'Unable to load subscription plans. Check your connection and try again.');
    } finally {
      setIsLoadingOfferings(false);
    }
  }, []);

  /** Re-check the active entitlement from RevenueCat. */
  const refreshCustomerInfo = useCallback(async () => {
    if (!isRevenueCatAvailable()) return;
    const premium = await checkPremiumStatus();
    setRcPremium(premium);
  }, []);

  /* ---- Initialization: configure + identify + initial fetches ---- */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!isCordova) {
        // Web: RevenueCat not used. Premium comes from backend flag below.
        setIsReady(true);
        return;
      }

      // Build a stable app user id from the owner/library id when available.
      const libraryId = user?.libraryId ?? (user?.isOwner ? user?.id : undefined);
      const appUserId = libraryId != null ? buildAppUserId(libraryId) : undefined;

      await configure(appUserId);

      // Identify the user (only when we have a stable id and it changed).
      if (appUserId && identifiedRef.current !== appUserId) {
        try {
          const info = await rcLogIn(appUserId);
          identifiedRef.current = appUserId;
          if (!cancelled && info) setRcPremium(hasPremiumEntitlement(info));
        } catch {
          /* identification failure is non-fatal */
        }
      }

      // Initial entitlement + offerings fetch.
      try {
        const info: RCCustomerInfo = await getCustomerInfo();
        if (!cancelled) setRcPremium(hasPremiumEntitlement(info));
      } catch {
        /* ignore */
      }
      await reloadOfferings();

      if (!cancelled) setIsReady(true);
    };

    init();

    // Real-time entitlement updates (renewals, restores, expirations).
    const unsubscribe = addCustomerInfoUpdateListener((info) => {
      setRcPremium(hasPremiumEntitlement(info));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // Re-run when the logged-in identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.libraryId]);

  /* ---- Purchase ---- */
  const purchase = useCallback(
    async (pkg: RCPackage): Promise<PurchaseOutcome> => {
      try {
        const info = await rcPurchasePackage(pkg);
        const premium = hasPremiumEntitlement(info);
        setRcPremium(premium);
        await syncBackend();
        return {
          success: true,
          isPremium: premium,
          message: premium ? 'Subscription activated successfully.' : 'Purchase completed.',
        };
      } catch (e: any) {
        // Purchase rejection is `{ userCancelled, error }`.
        if (e?.userCancelled) {
          return { success: false, userCancelled: true, message: 'Purchase cancelled.' };
        }
        return {
          success: false,
          message: e?.error?.message || e?.message || 'Purchase failed. Please try again.',
        };
      }
    },
    [syncBackend],
  );

  /* ---- Restore ---- */
  const restore = useCallback(async (): Promise<PurchaseOutcome> => {
    try {
      const info = await rcRestorePurchases();
      const premium = hasPremiumEntitlement(info);
      setRcPremium(premium);
      await syncBackend();
      return {
        success: true,
        isPremium: premium,
        message: premium
          ? 'Purchases restored. Premium access is active.'
          : 'No active subscription was found to restore.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Could not restore purchases. Please try again.',
      };
    }
  }, [syncBackend]);

  const openPaywall = useCallback(() => setIsPaywallOpen(true), []);
  const closePaywall = useCallback(() => setIsPaywallOpen(false), []);

  // Combined premium flag: entitlement on Cordova, backend flag on web.
  const isPremium = useMemo(() => {
    if (isCordova) return rcPremium || Boolean(user?.is_subscription_active);
    return Boolean(user?.is_subscription_active);
  }, [rcPremium, user?.is_subscription_active]);

  const value: RevenueCatContextType = {
    isReady,
    isPremium,
    offering,
    isLoadingOfferings,
    offeringsError,
    reloadOfferings,
    refreshCustomerInfo,
    purchase,
    restore,
    isPaywallOpen,
    openPaywall,
    closePaywall,
  };

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};

/** Access RevenueCat state + actions anywhere in the tree. */
export const useRevenueCat = () => useContext(RevenueCatContext);

/** Convenience hook for premium gating. */
export const usePremium = () => {
  const { isPremium, isReady } = useRevenueCat();
  return { isPremium, isReady };
};
