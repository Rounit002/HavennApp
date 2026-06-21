/**
 * Paywall.tsx
 * -----------------------------------------------------------------------------
 * Global paywall modal. Rendered once near the app root and opened from
 * anywhere via `useRevenueCat().openPaywall()` (e.g. the navbar Upgrade button).
 *
 * The actual offering UI lives in <PaywallContent /> so it can be reused on the
 * full /subscription page as well.
 * -----------------------------------------------------------------------------
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useRevenueCat } from '../context/RevenueCatContext';
import { PaywallContent } from './PaywallContent';

export const Paywall: React.FC = () => {
  const { isPaywallOpen, closePaywall } = useRevenueCat();

  return (
    <Dialog open={isPaywallOpen} onOpenChange={(open) => (!open ? closePaywall() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Upgrade to Havenn Premium</DialogTitle>
        </DialogHeader>
        {/* Close the modal automatically once premium is granted. */}
        <PaywallContent compact onPremiumGranted={closePaywall} />
      </DialogContent>
    </Dialog>
  );
};

export default Paywall;
