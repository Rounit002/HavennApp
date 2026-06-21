# Havenn — Security Audit

Date: 2026-06-16
Scope: Backend (Express/Postgres), Frontend (Vite/React), Cordova app (`havenn/`), and what is exposed on the production servers.

This report lists every exposure and security flaw found, ordered by severity, with concrete fixes. The items your viewers flagged in chat (`/.git/config`, `/.git/HEAD`, `/.htpasswd`) are real and are tied to the single most dangerous problem in this repo — read CRIT‑01 and CRIT‑02 together.

---

## Remediation status (updated 2026-06-16)

| ID | Issue | Status |
|----|-------|--------|
| CRIT‑01 | `.git`/dotfiles reachable | ✅ Code fixed (dotfile blocker + `dotfiles:'deny'`). ⚠️ Verify on deploy that `.git` isn't shipped. |
| CRIT‑02 | Keystore + password in git | ✅ Untracked + gitignored. ⚠️ Needs history purge + key rotation (your action). |
| CRIT‑03 | Plaintext staff/admin passwords | ✅ Fixed (bcrypt everywhere + lazy migration on login). |
| HIGH‑01 | Hardcoded session secret | ✅ Fixed (fail-fast in production). |
| HIGH‑02 | Forgot-password takeover | 🟡 Partial (hash + bug fix + rate limit). ⚠️ OTP still recommended. |
| HIGH‑03 | Error/stack leakage | ✅ Fixed (sanitized in production). |
| HIGH‑04 | Unauthenticated `/api/test-email` | ✅ Fixed (auth required). |
| HIGH‑05 | Permissive CORS | ✅ Improved (explicit CORS rejection handling; allow-list kept). |
| MED‑01 | Cookie not always httpOnly | ✅ Fixed (`httpOnly: true`). |
| MED‑02 | No rate limiting | ✅ Fixed (auth endpoints throttled). |
| MED‑03 | No security headers | ✅ Fixed (`helmet`). |
| MED‑04 | DB TLS verification off | ⚠️ Not changed (needs provider CA — see note). |
| MED‑05 | Backup/dead files | ✅ Removed `server copy.js`, `collections_backup.js`, `collections_broken.js`. ⚠️ `havenn/www_backup_*` left for you. |
| MED‑06 | Example secret value | ✅ Fixed (placeholder). |
| MED‑07 | Log files | ✅ Gitignored. |

Legend: ✅ done in code · 🟡 partially done · ⚠️ requires your action / deploy verification.

### Still requires your action
1. **CRIT‑02 — purge history + rotate the key.** Untracking does not remove the keystore/password from past commits. Run a history rewrite (`git filter-repo` / BFG), force-push, generate a new keystore with a new password, and request a Play upload-key reset. Treat `Rounit@2003` as compromised.
2. **CRIT‑01 — verify deploy.** After deploying, confirm `curl -i https://<domain>/.git/config` returns 404.
3. **MED‑04 — DB TLS.** Switch `ssl: { rejectUnauthorized: false }` to use your provider's CA so the certificate is actually verified. Left unchanged to avoid breaking the live Supabase connection.
4. **HIGH‑02 — OTP.** Replace knowledge-based (email+phone) reset with an emailed/WhatsApp one-time code.

---

## TL;DR — Fix these today

1. Stop serving the `.git` directory from production (CRIT‑01).
2. The Android signing keystore **and its password** are committed to git (CRIT‑02). Combined with the `.git` exposure, anyone can download your app signing key. This is the worst issue here.
3. Staff/admin passwords are stored and compared in **plaintext** (CRIT‑03).
4. Rotate every secret that has ever lived in the repo or in `build.json`.

---

## CRITICAL

### CRIT‑01 — `.git` directory is reachable on the production server
Your audience reported that `/.git/config`, `/.git/HEAD`, and `/.htpasswd` respond on the live site.

Why it is dangerous: if the `.git` folder is downloadable, an attacker can reconstruct your **entire source code and full commit history** with off-the-shelf tools (`git-dumper`). That history contains everything in CRIT‑02 (signing key + password) and any secret ever committed, even if later deleted.

How it is happening: the backend serves static files and has a catch‑all route:
```js
app.use(express.static(path.join(__dirname, 'dist'), staticOptions));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { /* sends dist/index.html */ });
```
If the deployed directory (Railway/Render) contains a `.git` folder, or a fronting web server serves the repo root, dotfiles get exposed. Even when the catch‑all returns `index.html` (HTTP 200) for these paths, naive scanners flag them — but a real `.git` exposure is far worse.

Fix:
- Ensure `.git` is **never** part of the deployed artifact. Add a `.dockerignore` / build step that excludes `.git`, or deploy only the `dist/` build output.
- Explicitly block dotfile access before static middleware:
```js
app.use((req, res, next) => {
  if (req.path.split('/').some(seg => seg.startsWith('.'))) {
    return res.status(404).end();
  }
  next();
});
```
- In `express.static`, set `dotfiles: 'deny'`.
- Verify after deploy: `curl -i https://<your-domain>/.git/config` must return 404 and **not** a valid git config.

### CRIT‑02 — Android release keystore and its password are committed to git
Tracked files (confirmed with `git ls-files`):
- `havenn/my-release-key.jks`
- `havenn/my-release-key.keystore`
- `havenn/build.json` — contains the keystore password in clear text:
```json
"storePassword": "Rounit@2003",
"password": "Rounit@2003"
```

Why it is dangerous: this is the key that signs your published Android app. With the keystore file plus this password, an attacker can sign malicious APKs that devices and stores will trust as genuine updates to your app. Because of CRIT‑01, these files are also potentially downloadable from production via `.git`.

Fix (in order):
1. Treat the key and password `Rounit@2003` as fully compromised.
2. Remove the files from the repo and from history:
   ```
   git rm --cached havenn/my-release-key.jks havenn/my-release-key.keystore havenn/build.json
   ```
   Then purge them from history with `git filter-repo` (preferred) or BFG, and force-push. Note: history rewriting is destructive and coordinated — back up first and confirm before doing it.
3. Add to `.gitignore`:
   ```
   *.jks
   *.keystore
   havenn/build.json
   ```
4. Generate a **new** keystore with a new strong password. For apps already on Google Play, request an **upload key reset** through the Play Console (Play App Signing lets you replace a compromised upload key).
5. Keep signing credentials only in CI secrets / environment variables, never in the repo.

### CRIT‑03 — Staff/admin passwords stored and compared in plaintext
`Backend/routes/auth.js` (login):
```js
// In a real app, use bcrypt.compare(password, user.password)
const isPasswordValid = (password === user.password);
```
`Backend/routes/users.js` (change password) and `auth.js` forgot-password reset both write/compare plaintext:
```js
const isPasswordValid = (current_password === userResult.rows[0].password);
...
UPDATE users SET password = $1  // newPassword stored as-is
```
`Backend/server.js` seeds a default admin with a plaintext password and a weak default:
```js
const plainPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
INSERT INTO users (username, password, ...) VALUES ($1, $2, ...)
```
Note: owner accounts already use `bcrypt` (`ownerAuth.js`, `settings.js`), so the codebase is inconsistent — staff/admin are the weak path. A database leak exposes all staff/admin credentials directly, and the default `admin/admin` is trivially guessable.

Fix:
- Hash all user passwords with `bcrypt` (cost ≥ 10) on create, change, reset, and the default-admin seed.
- Replace plaintext comparisons with `bcrypt.compare`.
- Migrate existing rows: force a reset, or hash-on-next-login.
- Remove the `'admin'` fallback; refuse to seed an admin without a strong `DEFAULT_ADMIN_PASSWORD`.

---

## HIGH

### HIGH‑01 — Hardcoded session secret fallback
`server.js`:
```js
secret: process.env.SESSION_SECRET || 'your-very-secure-secret-key-please-change'
```
If `SESSION_SECRET` is unset in production, sessions are signed with a publicly known string, allowing cookie forgery. Fix: fail fast on startup if `SESSION_SECRET` is missing in production; never ship a default.

### HIGH‑02 — Account-takeover risk in staff forgot-password flow
`auth.js` `/forgot-password/verify` + `/reset`: identity is proven only by knowing `email` + `phone` + `libraryCode` (all guessable/discoverable), with no OTP or email link. Anyone who knows a staff member's email and phone can reset their password. There is also a bug: it logs `req.session.staffPasswordReset?.userId` *after* `delete req.session.staffPasswordReset`, so it always logs `undefined`.

Fix: require a one-time code sent to the verified email/phone (you already integrate Brevo/WhatsApp), expire it, and rate-limit attempts.

### HIGH‑03 — Internal error details leaked to clients
Global handler and many routes return `error: err.message` (and the global handler builds a 500 from raw errors). Stack traces and DB messages can leak schema/internal info.
```js
res.status(500).json({ message: 'Internal Server Error', error: err.message });
```
Fix: log details server-side; return a generic message and an error id to clients in production.

### HIGH‑04 — Unauthenticated diagnostic endpoint
`GET /api/test-email` is mounted with no auth and triggers email sends using settings — abusable for spam / cost. Fix: protect behind owner/admin auth or remove from production.

### HIGH‑05 — Permissive CORS with credentials
`server.js` allows requests with **no origin** and `Origin: null`/`file://` while `credentials: true`. `null`-origin acceptance can be abused by sandboxed/malicious documents. Fix: keep the explicit allow-list for browser origins, and handle native app requests via a token/header check rather than blanket-allowing `null` and missing origins with credentials.

---

## MEDIUM

### MED‑01 — Session cookie not always `httpOnly`
```js
httpOnly: process.env.NODE_ENV === 'production'
```
`httpOnly` should be `true` in every environment so JS can never read the session cookie. Keep `secure`/`sameSite` tied to production as needed, but always set `httpOnly: true`.

### MED‑02 — No rate limiting / brute-force protection
Login, forgot-password verify, and reset have no throttling. Add `express-rate-limit` (and ideally account lockout/backoff) on auth endpoints.

### MED‑03 — Missing security headers
No `helmet`. Add it to set HSTS, `X-Content-Type-Options`, frame options, and a Content-Security-Policy.

### MED‑04 — Database TLS verification disabled
```js
ssl: { rejectUnauthorized: false }
```
This accepts any certificate (MITM risk). Use the provider CA so the cert is actually verified.

### MED‑05 — Dead/backup source files committed
`Backend/routes/collections_backup.js`, `collections_broken.js`, `Backend/server copy.js`, and `havenn/www_backup_20260606_221524/` enlarge the attack surface and can contain stale logic/secrets. Remove them from the repo.

### MED‑06 — Example secret value shipped in `.env.example`
`Backend/.env.example` ships `GOOGLE_PLAY_WEBHOOK_TOKEN=supersecrettoken`. Placeholders should not look like usable values; use `<replace-me>` to avoid someone running with the default.

### MED‑07 — Log files tracked/present in app dir
`Backend/combined.log` and `error.log` sit in the app directory. Ensure they are gitignored and rotated, and that logs never capture credentials or tokens.

---

## LOW

- **LOW‑01** Verbose `console.log` of usernames, roles, and request paths across auth routes — reduce in production to avoid leaking operational detail.
- **LOW‑02** `Frontend/.env` contains `VITE_RAZORPAY_KEY_ID=rzp_live_...`. This is a *publishable* key and is safe to expose by design — just confirm no Razorpay **secret** key is ever placed in frontend env, and that `.env` (not just `.env.example`) stays gitignored (currently it is not tracked, which is correct).
- **LOW‑03** Multi-tenant isolation depends on middleware order (`ensureDataIsolation`) being applied to every route. Audit each router to confirm no query trusts a client-supplied `library_id`.

---

## What is NOT exposed (verified)
- The real `Backend/.env` and `Frontend/.env` are **not** tracked in git and have no commit history — good.
- The `rapid-hall-...json` service account is gitignored at the repo root.
- Owner authentication correctly uses bcrypt.

---

## Suggested remediation order
1. CRIT‑01: block `.git`/dotfiles on production and redeploy without `.git`.
2. CRIT‑02: rotate the Android signing key, purge keystore + `build.json` from history, request Play upload-key reset.
3. CRIT‑03: hash all user passwords, remove `admin/admin` default.
4. Rotate every secret that ever touched the repo (keystore password, and as a precaution DB/Cloudinary/Brevo/webhook tokens).
5. HIGH items (session secret enforcement, forgot-password OTP, error sanitization, lock down `/api/test-email`, tighten CORS).
6. MEDIUM/LOW hardening (helmet, rate limiting, cookie flags, DB TLS, cleanup).
