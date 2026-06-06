# Google Play Billing Setup (Cordova Android)

Note: Razorpay has been removed. Subscriptions are handled via Google Play Billing only.

## 1) Install backend dependency

Run in Backend directory:

```bash
npm install googleapis
```

## 2) Environment variables (.env)

Add the following to your Backend/.env (example values):

```env
# Google Play Billing (Server)
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/...gserviceaccount.com"}
# Alternatively, provide a file path instead of inline JSON:
# GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json

# Your Android package name (from havenn/config.xml <widget id="..."></widget>)
GOOGLE_PLAY_PACKAGE_NAME=com.havenn.app

# The subscription product ID from Play Console
GOOGLE_PLAY_PRODUCT_ID=havenn_premium_monthly

# Optional: Shared token to validate Pub/Sub push webhook
# Configure the same token in the Pub/Sub push subscription
GOOGLE_PLAY_WEBHOOK_TOKEN=supersecrettoken
```

## 3) Configure Google Play Console

- Create a subscription product (note the Product ID)
- Upload an internal testing build and add tester Gmail accounts
- Enable the Google Play Android Developer API in Google Cloud
- Create a service account and download its JSON key
- Link the service account in Play Console > API access with appropriate permissions

## 4) Routes

- Verification: `POST /api/subscriptions/google-play/verify` (owner session required)
- Webhook: `POST /api/subscriptions/google-play/webhook` (called by Google; returns 200 quickly)

## 5) Database migration

Run the migration `010_add_google_play_fields.sql` to add Google Play fields to `libraries`.
