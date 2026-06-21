/**
 * PaywallContent.tsx
 * -----------------------------------------------------------------------------
 * Presentational paywall used both inside the Paywall modal and on the
 * /subscription page. It renders RevenueCat offerings dynamically (pricing,
 * billing period and any free-trial / introductory pricing) and handles the
 * full purchase + restore flow with loading and error states.
 *
 * All subscription logic lives in RevenueCatContext; this component only renders
 * state and dispatches actions, keeping it reusable and testable.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Crown, Loader2, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useRevenueCat } from '../context/RevenueCatContext';
import { isWeb } from '../utils/platformUtils';
import type { RCPackage, RCStoreProduct } from '../services/revenueCatService';

/** Google Play listing for the Havenn Android app (package id from config.xml). */
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.havenn.studyspace';

interface PaywallContentProps {
  /** Called after a successful purchase or restore that grants premium. */
  onPremiumGranted?: () => void;
  /** Compact mode tightens spacing for use inside the modal. */
  compact?: boolean;
}

/* ----------------------------- formatting utils ---------------------------- */

/** Convert an ISO 8601 duration (e.g. "P1M", "P3M", "P1Y", "P1W") to a label. */
function formatPeriod(iso?: string | null): string {
  if (!iso) return '';
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(iso);
  if (!match) return '';
  const [, y, mo, w, d] = match;
  if (y) return Number(y) === 1 ? 'year' : `${y} years`;
  if (mo) return Number(mo) === 1 ? 'month' : `${mo} months`;
  if (w) return Number(w) === 1 ? 'week' : `${w} weeks`;
  if (d) return Number(d) === 1 ? 'day' : `${d} days`;
  return '';
}

/** Build a "₹299 / month" style price string from a product. */
function priceLabel(product: RCStoreProduct): string {
  const period = formatPeriod(product.subscriptionPeriod);
  return period ? `${product.priceString} / ${period}` : product.priceString;
}

/** Human readable free-trial / intro offer line, if present. */
function promoLabel(product: RCStoreProduct): string | null {
  const intro = product.introPrice;
  if (!intro) return null;
  const period = formatPeriod(intro.period);
  if (intro.price === 0) {
    return period ? `${period} free trial` : 'Free trial included';
  }
  return period ? `Intro: ${intro.priceString} for ${period}` : `Intro offer: ${intro.priceString}`;
}

/* --------------------------------------------------------------------------- */

const PREMIUM_FEATURES = [
  'Unlimited students & data',
  'All library management features',
  'Attendance, reports & analytics',
  'Priority customer support',
];

export const PaywallContent: React.FC<PaywallContentProps> = ({ onPremiumGranted, compact }) => {
  const {
    isReady,
    isPremium,
    offering,
    isLoadingOfferings,
    offeringsError,
    reloadOfferings,
    purchase,
    restore,
  } = useRevenueCat();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const packages = useMemo<RCPackage[]>(
    () => offering?.availablePackages ?? [],
    [offering],
  );

  // Pre-select the first (or annual, as best value) package once loaded.
  useEffect(() => {
    if (!selectedId && packages.length > 0) {
      const annual = packages.find((p) => p.packageType === 'ANNUAL');
      setSelectedId((annual || packages[0]).identifier);
    }
  }, [packages, selectedId]);

  const handleSubscribe = async () => {
    const pkg = packages.find((p) => p.identifier === selectedId);
    if (!pkg) {
      toast.error('Please select a plan to continue.');
      return;
    }
    setIsPurchasing(true);
    const result = await purchase(pkg);
    setIsPurchasing(false);

    if (result.success && result.isPremium) {
      toast.success(result.message || 'Subscription activated.');
      onPremiumGranted?.();
    } else if (result.userCancelled) {
      // Quietly ignore – user backed out of the Google Play sheet.
    } else if (result.success) {
      toast.success(result.message || 'Purchase completed.');
    } else {
      toast.error(result.message || 'Purchase failed. Please try again.');
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const result = await restore();
    setIsRestoring(false);

    if (result.success && result.isPremium) {
      toast.success(result.message || 'Purchases restored.');
      onPremiumGranted?.();
    } else if (result.success) {
      toast.info(result.message || 'No active subscription found.');
    } else {
      toast.error(result.message || 'Could not restore purchases.');
    }
  };

  /* ------------------------------- render ------------------------------- */

  // Already subscribed.
  if (isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F5EE]">
          <ShieldCheck className="h-8 w-8 text-[#1D9E75]" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900">You're Premium 🎉</h3>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          Your subscription is active and all premium features are unlocked.
        </p>
        <Button variant="outline" className="mt-6" onClick={handleRestore} disabled={isRestoring}>
          {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Restore Purchases
        </Button>
      </div>
    );
  }

  // Web: RevenueCat purchasing is Android-only. Direct users to the app instead
  // of showing the empty-offerings state (offerings never load on web).
  if (isWeb) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#1A8FA8] shadow-lg">
          <Smartphone className="h-8 w-8 text-white" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900">Subscribe in the Havenn app</h3>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          Premium subscriptions are managed through the Havenn Android app. Install it and tap
          Upgrade to unlock all features — your premium access then syncs back here automatically.
        </p>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="mt-6">
          <Button size="lg" className="text-base font-bold">
            <Smartphone className="h-5 w-5" /> Get the Android app
          </Button>
        </a>
      </div>
    );
  }

  // Loading state.
  if (!isReady || isLoadingOfferings) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
        <p className="mt-4 text-sm font-medium text-gray-600">Loading subscription plans...</p>
      </div>
    );
  }

  // Error / empty state.
  if (offeringsError || packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="max-w-sm text-sm text-gray-600">
          {offeringsError || 'No subscription plans are available right now.'}
        </p>
        <Button variant="outline" className="mt-5" onClick={() => reloadOfferings()}>
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
        <Button variant="ghost" className="mt-2" onClick={handleRestore} disabled={isRestoring}>
          {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Restore Purchases
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#1A8FA8] shadow-lg">
          <Crown className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-gray-900">Unlock Havenn Premium</h2>
        <p className="mt-1 text-sm text-gray-600">Run your study space like a pro. Cancel anytime.</p>
      </div>

      {/* Feature list */}
      <ul className="mx-auto grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E1F5EE]">
              <Check className="h-3 w-3 text-[#1D9E75]" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Plans (dynamic from RevenueCat) */}
      <div className="space-y-3">
        {packages.map((pkg) => {
          const product = pkg.product;
          const isSelected = pkg.identifier === selectedId;
          const promo = promoLabel(product);
          const isBestValue = pkg.packageType === 'ANNUAL';
          return (
            <button
              type="button"
              key={pkg.identifier}
              onClick={() => setSelectedId(pkg.identifier)}
              aria-pressed={isSelected}
              className={`relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#1D9E75] bg-[#F3FBF8] shadow-md'
                  : 'border-gray-200 bg-white hover:border-[#9FE1CB]'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-gray-900">
                    {product.title || pkg.packageType}
                  </span>
                  {isBestValue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8] px-2 py-0.5 text-[10px] font-bold text-white">
                      <Sparkles className="h-3 w-3" /> BEST VALUE
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#0F6E56]">{priceLabel(product)}</div>
                {promo && <div className="mt-0.5 text-xs font-medium text-amber-600">{promo}</div>}
              </div>
              {/* Radio indicator */}
              <span
                className={`ml-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-gray-300'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="w-full text-base font-bold"
          disabled={isPurchasing || isRestoring || !selectedId}
          onClick={handleSubscribe}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Crown className="h-5 w-5" /> Subscribe Now
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isPurchasing || isRestoring}
          onClick={handleRestore}
        >
          {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Restore Purchases
        </Button>
      </div>

      {/* Legal / store note */}
      <p className="px-2 text-center text-[11px] leading-relaxed text-gray-400">
        Payment is charged to your Google Play account. Subscriptions renew automatically unless
        cancelled at least 24 hours before the end of the current period. Manage or cancel anytime
        in Google Play.
      </p>
    </div>
  );
};

export default PaywallContent;
