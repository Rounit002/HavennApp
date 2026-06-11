# Havenn

Multi-tenant study space and library management platform.

- Backend: Node.js + Express + PostgreSQL
- Frontend: React + TypeScript + Vite
- Mobile: Cordova Android wrapper loading the hosted SPA

## Monorepo layout
- Backend/ — Express API, static SPA hosting, migrations, utilities
- Frontend/ — React + Vite SPA (TypeScript)
- havenn/ — Cordova Android project (config.xml, signing, build config)

## Quick start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ (recommended 14+)
- npm (or bun/pnpm if you prefer, but scripts use npm)

### 1) Environment
- Backend: copy `Backend/.env.example` to `Backend/.env` and fill values
- Frontend: copy `Frontend/.env.example` to `Frontend/.env` (if used)
- For Google Play Billing details, see `Backend/SETUP_INSTRUCTIONS.md`

Key backend envs (see ARCHITECTURE.md for full list):
- Database: `DATABASE_URL` or `DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT`
- Server: `PORT` (default 3000), `SESSION_SECRET`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Email: `BREVO_API_KEY`, `BREVO_TEMPLATE_ID`
- Google Play Billing: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`, `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_PRODUCT_ID`

### 2) Database
- Option A: bootstrap with `Backend/schema/create_all_tables.sql`
- Option B: apply SQL files in `Backend/migrations/` sequentially

### 3) Install
- Backend:
  - `cd Backend && npm install`
- Frontend:
  - `cd Frontend && npm install`

### 4) Run (development)
- Backend API: `npm run dev` from `Backend/` (default http://localhost:3000)
- Frontend SPA: `npm run dev` from `Frontend/` (default http://localhost:5173)

CORS is configured to allow localhost dev ports and mobile WebView origins. The SPA uses cookies for session auth; enable credentials on client requests.

### 5) Build for web (served by Backend)
- From `Backend/`: `npm run build`
  - Builds the Frontend and copies artifacts to `Backend/dist`
- Start server: `npm start` (serves API and SPA from `dist/`)

### 6) Mobile (Cordova Android)
- Project: `havenn/`
- Ensure `config.xml` points `content src` to the hosted SPA URL you deploy
- Follow Android build/signing practices; Billing permission is handled by plugin

## Documentation
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Technical Design: [docs/DESIGN.md](docs/DESIGN.md)
- UI/UX Design: [docs/UI_UX_DESIGN.md](docs/UI_UX_DESIGN.md)
- Context: [docs/CONTEXT.md](docs/CONTEXT.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Development notes
- All guarded routes must enforce data isolation (see `ensureDataIsolation` middleware)
- Sessions are cookie-based, 30-day lifetime; configure secure/SameSite for production
- Static assets are served from `Backend/dist/` when built

## Security
- Never commit secrets. Use environment variables.
- Always filter DB queries by `library_id` for multi-tenancy.
- Validate user input on all routes; limit upload size and check mimetypes.

## License
TBD

## Support / Contributions
Open an issue or PR. Please keep CHANGELOG updated and reference tickets in PR descriptions.
