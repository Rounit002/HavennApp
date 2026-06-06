import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onCordovaReady } from '../utils/platformUtils';
import { API_BASE_URL } from '../utils/apiConfig';

interface Props {
  productId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const GooglePlaySubscription: React.FC<Props> = ({ productId, onSuccess, onError }) => {
  const [loading, setLoading] = useState(true);
  // Using any here to avoid hard dependency on global ambient types resolution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isOwned, setIsOwned] = useState(false);

  const initializedRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = useMemo(() => (typeof window !== 'undefined' ? (window as any).CdvPurchase?.store : undefined), []);

  useEffect(() => {
    let cancelled = false;

    onCordovaReady(async () => {
      if (cancelled || initializedRef.current) return;
      initializedRef.current = true;

      if (!store) {
        setError('Billing store not available. Ensure cordova-plugin-purchase is installed.');
        setLoading(false);
        return;
      }

      try {
        // Resolve enum-like constants from plugin (fallback to string literals)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const NS: any = (window as any).CdvPurchase || {};
        const PT = NS.ProductType || {};
        const PL = NS.Platform || {};

        // Register product
        await store.register({
          id: productId,
          type: PT.AUTO_RENEWABLE_SUBSCRIPTION || 'AUTO_RENEWABLE_SUBSCRIPTION',
          platform: PL.GOOGLE_PLAY || 'GOOGLE_PLAY',
        });

        // Events
        const w = store.when();
        w.approved?.(async (tx) => {
          try {
            // Backend verification first
            const body = {
              purchaseToken: tx.purchaseToken,
              productId: tx.products?.[0]?.id || productId,
            };
            const resp = await fetch(`${API_BASE_URL}/subscriptions/google-play/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(body),
            });
            if (!resp.ok) {
              const msg = `Verification failed (${resp.status}).`;
              setError(msg);
              onError?.(msg);
              return;
            }
            // Ask plugin to verify (if available), then finish
            if (typeof tx.verify === 'function') {
              await tx.verify();
            }
            if (typeof tx.finish === 'function') {
              await tx.finish();
            } else {
              await store.finish(tx as any);
            }
          } catch (e: any) {
            const msg = e?.message || 'Verification error';
            setError(msg);
            onError?.(msg);
          }
        });

        w.verified?.((tx) => {
          // No-op here as we finish in approved handler after backend verification
        });

        w.finished?.((tx) => {
          setIsOwned(true);
          setIsPurchasing(false);
          onSuccess?.();
          try {
            // Notify app to refresh auth/subscription state
            (window as any).dispatchEvent(new Event('subscription:updated'));
          } catch {}
        });

        w.productUpdated?.((p) => {
          if (p.id === productId) {
            setProduct(p);
            setIsOwned(!!p.owned);
          }
        });

        // Initialize store
        await store.initialize(PL.GOOGLE_PLAY || 'GOOGLE_PLAY');

        // Fetch product info
        const p = store.get(productId);
        if (p) {
          setProduct(p);
          setIsOwned(!!p.owned);
        }
      } catch (e: any) {
        const msg = e?.message || 'Failed to initialize billing.';
        setError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [productId, store, onSuccess, onError]);

  const handleSubscribe = async () => {
    if (!store) return;
    setIsPurchasing(true);
    setError(null);
    try {
      await store.order(productId);
    } catch (e: any) {
      const msg = e?.message || 'Failed to start purchase.';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsPurchasing(false);
    }
  };

  // UI
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-3 text-gray-700">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-2">Google Play Subscription</h2>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4">
          {error}
        </div>
      )}

      {isOwned ? (
        <div className="flex items-center text-green-700 bg-green-50 border border-green-200 rounded-md p-4">
          <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.829a1 1 0 111.414-1.414l3.121 3.121 6.657-6.657a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          <span className="font-semibold">Subscription Active</span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700">Subscribe to unlock premium features</p>
            <p className="text-gray-500 text-sm">Product: <code>{productId}</code></p>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={isPurchasing}
            className={`px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isPurchasing
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 text-white hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 shadow-lg'
            }`}
          >
            {isPurchasing ? 'Processing…' : `Subscribe${product?.pricing?.price ? ` — ${product.pricing.price}` : ''}`}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">Purchases are handled securely by Google Play Billing.</p>
    </div>
  );
};

export default GooglePlaySubscription;
