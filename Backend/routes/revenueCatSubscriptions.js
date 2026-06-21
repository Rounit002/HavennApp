/**
 * revenueCatSubscriptions.js
 * -----------------------------------------------------------------------------
 * Backend integration for RevenueCat (Android subscriptions via Google Play).
 *
 * RevenueCat is the source of truth for entitlements. This module keeps the
 * Havenn `libraries` table in sync so existing server-side feature gating
 * (validateSubscription middleware) keeps working.
 *
 * Two entry points:
 *   1. POST /api/subscriptions/revenuecat/sync   (owner-auth)
 *      Called by the app right after a purchase/restore. Pulls the latest
 *      subscriber state from the RevenueCat REST API and updates the DB so the
 *      unlock is reflected immediately (without waiting for a webhook).
 *
 *   2. POST /api/subscriptions/revenuecat/webhook (server-to-server)
 *      Receives RevenueCat events (renewals, cancellations, expirations, etc.)
 *      and reconciles the DB. Protected by a shared Authorization header.
 *
 * App User ID convention (set by the frontend): `havenn_<libraryId>`.
 * -----------------------------------------------------------------------------
 */

const express = require('express');
const https = require('https');
const { authenticateOwner } = require('./ownerAuth');

// Entitlement identifier configured in RevenueCat (must match the frontend).
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || 'premium';
const APP_USER_PREFIX = 'havenn_';

/** Extract the numeric library id from a RevenueCat app_user_id. */
const libraryIdFromAppUserId = (appUserId) => {
  if (!appUserId || typeof appUserId !== 'string') return null;
  if (!appUserId.startsWith(APP_USER_PREFIX)) return null;
  const raw = appUserId.slice(APP_USER_PREFIX.length);
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
};

/**
 * Minimal HTTPS GET helper for the RevenueCat REST API (avoids adding a new
 * dependency – the codebase already uses native modules elsewhere).
 */
const rcApiGet = (path) =>
  new Promise((resolve, reject) => {
    const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!secretKey) {
      return reject(new Error('Missing REVENUECAT_SECRET_API_KEY'));
    }
    const req = https.request(
      {
        hostname: 'api.revenuecat.com',
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(json?.message || `RevenueCat API error ${res.statusCode}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });

/**
 * Map a RevenueCat subscriber's entitlement to the columns used by Havenn.
 * Returns the values to persist for the given library.
 */
const deriveSubscriptionState = (subscriber) => {
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  const expiresAt = entitlement?.expires_date ? new Date(entitlement.expires_date) : null;
  const purchasedAt = entitlement?.purchase_date ? new Date(entitlement.purchase_date) : null;

  // Active when the entitlement exists and either has no expiry (lifetime) or
  // its expiry is still in the future.
  const isActive = Boolean(entitlement) && (!expiresAt || expiresAt.getTime() > Date.now());

  return {
    isActive,
    startDate: purchasedAt,
    endDate: expiresAt,
    productId: entitlement?.product_identifier || null,
    status: isActive ? 'active' : 'expired',
  };
};

const createRevenueCatRouter = (pool) => {
  const router = express.Router();

  /** Persist subscription state for a library id. */
  const updateLibrarySubscription = async (libraryId, state) => {
    await pool.query(
      `UPDATE libraries SET
         is_subscription_active = $1,
         is_trial = CASE WHEN $1 = true THEN false ELSE is_trial END,
         subscription_status = $2,
         subscription_plan = COALESCE($3, subscription_plan),
         subscription_start_date = COALESCE($4, subscription_start_date),
         subscription_end_date = COALESCE($5, subscription_end_date),
         subscription_expires_at = COALESCE($5, subscription_expires_at),
         google_play_product_id = COALESCE($3, google_play_product_id)
       WHERE id = $6`,
      [
        state.isActive,
        state.status,
        state.productId,
        state.startDate,
        state.endDate,
        libraryId,
      ],
    );
  };

  /**
   * On-demand sync triggered by the app after purchase/restore.
   * Reads the current owner's subscriber record from RevenueCat and updates DB.
   */
  router.post('/sync', authenticateOwner, async (req, res) => {
    try {
      const libraryId = req.session.owner.id;
      const appUserId = `${APP_USER_PREFIX}${libraryId}`;

      const data = await rcApiGet(`/v1/subscribers/${encodeURIComponent(appUserId)}`);
      const state = deriveSubscriptionState(data?.subscriber || {});
      await updateLibrarySubscription(libraryId, state);

      // Keep the session in sync so guarded routes pass immediately.
      req.session.owner.is_subscription_active = state.isActive;
      if (state.isActive) req.session.owner.is_trial = false;

      return res.status(200).json({
        success: true,
        isActive: state.isActive,
        endDate: state.endDate,
      });
    } catch (error) {
      // Non-fatal for the client – it already unlocked locally via entitlement.
      return res.status(200).json({ success: false, error: error.message });
    }
  });

  /**
   * RevenueCat webhook receiver. Configure the URL + Authorization header value
   * in RevenueCat dashboard → Integrations → Webhooks.
   */
  router.post('/webhook', async (req, res) => {
    try {
      const expected = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
      if (expected && req.headers.authorization !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const event = req.body?.event;
      if (!event) {
        return res.status(200).json({ received: true });
      }

      const appUserId = event.app_user_id || event.original_app_user_id;
      const libraryId = libraryIdFromAppUserId(appUserId);
      if (!libraryId) {
        // Unknown / anonymous user – acknowledge so RevenueCat stops retrying.
        return res.status(200).json({ received: true });
      }

      // Prefer the authoritative subscriber record when we can fetch it;
      // otherwise fall back to the event payload.
      let state;
      try {
        const data = await rcApiGet(`/v1/subscribers/${encodeURIComponent(appUserId)}`);
        state = deriveSubscriptionState(data?.subscriber || {});
      } catch {
        const expiresAt = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;
        const purchasedAt = event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : null;
        const activeTypes = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'];
        const isActive = activeTypes.includes(event.type) && (!expiresAt || expiresAt.getTime() > Date.now());
        state = {
          isActive,
          startDate: purchasedAt,
          endDate: expiresAt,
          productId: event.product_id || null,
          status: isActive ? 'active' : 'expired',
        };
      }

      await updateLibrarySubscription(libraryId, state);
      return res.status(200).json({ received: true });
    } catch (error) {
      // Always 200 so RevenueCat does not hammer retries on transient issues.
      return res.status(200).json({ received: true, error: error.message });
    }
  });

  return router;
};

module.exports = { createRevenueCatRouter };
