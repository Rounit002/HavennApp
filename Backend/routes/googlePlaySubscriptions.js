// routes/googlePlaySubscriptions.js
// Google Play Billing verification and webhook handlers

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const winston = require('winston');
const { authenticateOwner } = require('./ownerAuth');

// Local logger for this module
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

function createGooglePlaySubscriptionsRouter(pool) {
  const router = express.Router();

  // Helper: load service account credentials from env
  const loadServiceAccount = () => {
    const jsonStr = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const jsonPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH;

    if (jsonStr && jsonStr.trim()) {
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        logger.error('[GP] Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ' + e.message);
        throw new Error('Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
      }
    }

    if (jsonPath && fs.existsSync(jsonPath)) {
      try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        logger.error('[GP] Failed to read GOOGLE_PLAY_SERVICE_ACCOUNT_PATH: ' + e.message);
        throw new Error('Failed to read GOOGLE_PLAY_SERVICE_ACCOUNT_PATH');
      }
    }

    throw new Error('Service account credentials not provided. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_PATH');
  };

  // Helper: build androidpublisher client
  const buildPublisherClient = async () => {
    const credentials = loadServiceAccount();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const client = await auth.getClient();
    const androidpublisher = google.androidpublisher({ version: 'v3', auth: client });
    return androidpublisher;
  };

  // Helper: upsert subscription info for a library owner
  const updateLibrarySubscription = async ({
    libraryId,
    productId,
    expiryDate,
    purchaseToken,
    status,
  }) => {
    const updateSql = `
      UPDATE libraries SET
        subscription_status = $1,
        subscription_plan = $2,
        subscription_end_date = $3,
        google_play_purchase_token = $4,
        google_play_product_id = $5,
        updated_at = NOW()
      WHERE id = $6
    `;
    await pool.query(updateSql, [status, productId, expiryDate, purchaseToken, productId, libraryId]);
  };

  // GET /api/subscriptions/google-play/health
  // Quick sanity check: validates service account credentials and (optionally) API access to the app
  router.get('/health', authenticateOwner, async (req, res) => {
    try {
      // If we can build the client, auth is OK
      const androidpublisher = await buildPublisherClient();
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;

      let reviewsOk = false;
      if (packageName) {
        try {
          // Lightweight call; may require proper API access for the app
          await androidpublisher.reviews.list({ packageName, maxResults: 1 });
          reviewsOk = true;
        } catch (e) {
          logger.warn('[GP] Health check: reviews.list failed (likely missing API access permissions): ' + e.message);
        }
      }

      return res.json({ ok: true, auth: true, packageConfigured: Boolean(packageName), reviewsOk });
    } catch (err) {
      logger.error('[GP] Health check failed', { message: err.message, stack: err.stack });
      return res.status(500).json({ ok: false, error: 'Google Play auth failed' });
    }
  });

  // POST /api/subscriptions/google-play/verify
  router.post('/verify', authenticateOwner, async (req, res) => {
    try {
      const { purchaseToken, productId } = req.body || {};
      if (!purchaseToken || typeof purchaseToken !== 'string' || !productId || typeof productId !== 'string') {
        return res.status(400).json({ error: 'purchaseToken and productId are required' });
      }

      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
      if (!packageName) {
        return res.status(500).json({ error: 'Server misconfigured: missing GOOGLE_PLAY_PACKAGE_NAME' });
      }

      const androidpublisher = await buildPublisherClient();

      // Verify purchase with Google Play Developer API
      const { data } = await androidpublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const paymentState = data.paymentState != null ? Number(data.paymentState) : null; // 1=received, 0=pending, 2=free-trial (per spec variants)
      const acknowledgementState = data.acknowledgementState != null ? Number(data.acknowledgementState) : 0; // 0=not acknowledged
      const expiryTimeMillis = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : null;
      const cancelReason = data.cancelReason != null ? Number(data.cancelReason) : null;

      if (!expiryTimeMillis) {
        logger.warn('[GP] Missing expiryTimeMillis in subscription get response');
      }

      if (paymentState === 1 || paymentState === 2 || (paymentState === null && data.expiryTimeMillis)) {
        const expiryDate = expiryTimeMillis ? new Date(expiryTimeMillis) : null;

        await updateLibrarySubscription({
          libraryId: req.session.owner.id,
          productId,
          expiryDate,
          purchaseToken,
          status: 'active',
        });

        // Acknowledge the purchase if not already acknowledged
        if (acknowledgementState === 0) {
          try {
            await androidpublisher.purchases.subscriptions.acknowledge({
              packageName,
              subscriptionId: productId,
              token: purchaseToken,
              requestBody: {}
            });
          } catch (ackErr) {
            logger.error('[GP] Failed to acknowledge subscription: ' + ackErr.message);
          }
        }

        return res.json({ success: true, expiryDate: expiryDate ? expiryDate.toISOString() : null, status: 'active' });
      }

      if (paymentState === 0) {
        return res.status(402).json({ error: 'Payment pending', status: 'pending' });
      }

      // Any other state is considered failure here
      return res.status(500).json({ error: 'Verification failed' });
    } catch (err) {
      logger.error('[GP] Verification error', { message: err.message, stack: err.stack });
      return res.status(500).json({ error: 'Verification failed' });
    }
  });

  // OPTIONAL: Pub/Sub webhook for RTDN
  router.post('/webhook', async (req, res) => {
    try {
      // Optional: shared-secret Authorization check
      const sharedToken = process.env.GOOGLE_PLAY_WEBHOOK_TOKEN;
      if (sharedToken) {
        const authz = req.headers['authorization'] || '';
        if (authz !== `Bearer ${sharedToken}`) {
          logger.warn('[GP] Webhook unauthorized: invalid Authorization token');
          // Intentionally still return 200 to avoid retries spamming, but log the attempt
          return res.status(200).json({ ok: true });
        }
      }

      const msg = req.body?.message;
      const dataB64 = msg?.data;
      if (!dataB64) {
        logger.warn('[GP] Webhook received without data');
        return res.status(200).json({ ok: true });
      }

      const decoded = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8'));
      const sub = decoded?.subscriptionNotification;
      if (!sub) {
        logger.info('[GP] Webhook received non-subscription notification');
        return res.status(200).json({ ok: true });
      }

      const notificationType = Number(sub.notificationType);
      const purchaseToken = sub.purchaseToken;
      const productId = sub.subscriptionId;
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;

      // Helper to re-verify and update
      const reverifyAndUpdate = async () => {
        try {
          const androidpublisher = await buildPublisherClient();
          const { data } = await androidpublisher.purchases.subscriptions.get({
            packageName,
            subscriptionId: productId,
            token: purchaseToken,
          });
          const expiryTimeMillis = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : null;
          const expiryDate = expiryTimeMillis ? new Date(expiryTimeMillis) : null;

          // Update by purchase token (find owner by stored token)
          const findSql = 'SELECT id FROM libraries WHERE google_play_purchase_token = $1 LIMIT 1';
          const findRes = await pool.query(findSql, [purchaseToken]);
          if (findRes.rows.length > 0) {
            await updateLibrarySubscription({
              libraryId: findRes.rows[0].id,
              productId,
              expiryDate,
              purchaseToken,
              status: 'active',
            });
          }
        } catch (e) {
          logger.error('[GP] Reverify/update failed: ' + e.message);
        }
      };

      // Handle notification types
      switch (notificationType) {
        case 1: // SUBSCRIPTION_RECOVERED
        case 2: // SUBSCRIPTION_RENEWED
          await reverifyAndUpdate();
          break;
        case 3: { // SUBSCRIPTION_CANCELED
          const sql = `UPDATE libraries SET subscription_status = 'cancelled', updated_at = NOW() WHERE google_play_purchase_token = $1`;
          await pool.query(sql, [purchaseToken]);
          break; }
        case 13: { // SUBSCRIPTION_EXPIRED
          const sql = `UPDATE libraries SET subscription_status = 'expired', updated_at = NOW() WHERE google_play_purchase_token = $1`;
          await pool.query(sql, [purchaseToken]);
          break; }
        default:
          logger.info('[GP] Webhook notification ignored: ' + notificationType);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      logger.error('[GP] Webhook handler error', { message: err.message, stack: err.stack });
      // Always 200 to avoid repeated retries
      return res.status(200).json({ ok: true });
    }
  });

  return router;
}

module.exports = createGooglePlaySubscriptionsRouter;
