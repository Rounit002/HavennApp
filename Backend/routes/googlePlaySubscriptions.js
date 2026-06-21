const express = require('express');
const { google } = require('googleapis');
const { Pool } = require('pg');
const { authenticateOwner } = require('./ownerAuth');

const router = express.Router();

const buildPgConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    };
  }

  return {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 10,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  };
};

const pool = new Pool(buildPgConfig());

const getServiceAccountCredentials = () => {
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  }

  return JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
};

const getAndroidPublisher = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: getServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const authClient = await auth.getClient();
  return google.androidpublisher({ version: 'v3', auth: authClient });
};

const getPackageName = () => {
  if (!process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    throw new Error('Missing GOOGLE_PLAY_PACKAGE_NAME');
  }

  return process.env.GOOGLE_PLAY_PACKAGE_NAME;
};

const getSubscriptionId = () => {
  if (!process.env.GOOGLE_PLAY_PRODUCT_ID) {
    throw new Error('Missing GOOGLE_PLAY_PRODUCT_ID');
  }

  return process.env.GOOGLE_PLAY_PRODUCT_ID;
};

const getSubscriptionPurchase = async (androidpublisher, purchaseToken, subscriptionId = getSubscriptionId()) => {
  const response = await androidpublisher.purchases.subscriptions.get({
    packageName: getPackageName(),
    subscriptionId,
    token: purchaseToken,
  });

  return response.data || {};
};

const toExpiryDate = (expiryTimeMillis) => {
  if (!expiryTimeMillis) return null;
  const millis = Number(expiryTimeMillis);
  return Number.isFinite(millis) ? new Date(millis) : null;
};

router.post('/verify', authenticateOwner, async (req, res) => {
  try {
    const { purchaseToken, productId } = req.body || {};

    if (!purchaseToken || typeof purchaseToken !== 'string') {
      return res.status(400).json({ success: false, error: 'purchaseToken is required' });
    }

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }

    const subscriptionId = getSubscriptionId();
    const androidpublisher = await getAndroidPublisher();
    const subscription = await getSubscriptionPurchase(androidpublisher, purchaseToken, subscriptionId);

    if (Number(subscription.paymentState) !== 1) {
      return res.status(400).json({ success: false, error: 'Payment not received' });
    }

    await pool.query(
      `UPDATE libraries SET
        subscription_status = 'active',
        subscription_expires_at = $1,
        google_play_purchase_token = $2,
        google_play_product_id = $3,
        google_play_subscription_id = $4
      WHERE id = $5`,
      [
        toExpiryDate(subscription.expiryTimeMillis),
        purchaseToken,
        productId,
        subscriptionId,
        req.session.owner.id,
      ]
    );

    await androidpublisher.purchases.subscriptions.acknowledge({
      packageName: getPackageName(),
      subscriptionId,
      token: purchaseToken,
      requestBody: {},
    });

    return res.status(200).json({ success: true, message: 'Subscription activated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const encodedMessage = req.body?.message?.data;

    if (!encodedMessage) {
      return res.status(200).json({ received: true });
    }

    const message = JSON.parse(Buffer.from(encodedMessage, 'base64').toString());
    const notification = message.subscriptionNotification;

    if (!notification || !notification.purchaseToken) {
      return res.status(200).json({ received: true });
    }

    const notificationType = Number(notification.notificationType);
    const purchaseToken = notification.purchaseToken;

    if (notificationType === 1) {
      await pool.query(
        "UPDATE libraries SET subscription_status = 'active' WHERE google_play_purchase_token = $1",
        [purchaseToken]
      );
    } else if (notificationType === 2) {
      const androidpublisher = await getAndroidPublisher();
      const subscription = await getSubscriptionPurchase(
        androidpublisher,
        purchaseToken,
        notification.subscriptionId || getSubscriptionId()
      );

      await pool.query(
        'UPDATE libraries SET subscription_expires_at = $1 WHERE google_play_purchase_token = $2',
        [toExpiryDate(subscription.expiryTimeMillis), purchaseToken]
      );
    } else if (notificationType === 3) {
      await pool.query(
        "UPDATE libraries SET subscription_status = 'canceled' WHERE google_play_purchase_token = $1",
        [purchaseToken]
      );
    } else if (notificationType === 13) {
      await pool.query(
        "UPDATE libraries SET subscription_status = 'expired' WHERE google_play_purchase_token = $1",
        [purchaseToken]
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(200).json({ received: true });
  }
});

router.get('/health', authenticateOwner, async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: getServiceAccountCredentials(),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    await auth.getClient();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

module.exports = router;
