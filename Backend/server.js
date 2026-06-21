// server.js
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const pgSession = require('connect-pg-simple')(session);
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const winston = require('winston');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { hashPassword } = require('./utils/password');
require('dotenv').config();

const { setupCronJobs } = require('./utils/cronJobs');
const { sendExpirationReminder } = require('./utils/email');

const app = express();

// Fail fast in production if the session secret is not configured (HIGH-01)
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required in production.');
  process.exit(1);
}

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// CORS - secure configuration for production and mobile apps
const allowedOrigins = [
  'https://havenn.up.railway.app',              // ✅ frontend
  'https://havennproduction.up.railway.app',   // ✅ backend
  'https://havennapp.onrender.com',
  'file://', // Cordova file:// protocol
  'null', // Some WebViews send Origin: null for file:// apps
  'https://localhost', // Cordova WebView origin (needed for mobile app)
  'capacitor://localhost', // Capacitor apps
  'ionic://localhost', // Ionic apps
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173'
  ] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin only for non-browser clients (e.g. native mobile, curl).
    // Browsers always send an Origin for cross-site credentialed requests, so this does not
    // weaken CORS for web apps while still supporting the Cordova/Capacitor mobile clients.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Info', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Security headers (MED-03). CSP disabled here because the SPA/build pipeline
// is not yet CSP-audited; everything else (HSTS, no-sniff, frameguard) is on.
app.use(helmet({ contentSecurityPolicy: false }));

// Block access to dotfiles such as /.git/*, /.env, /.htpasswd before any static
// middleware can serve them (CRIT-01).
app.use((req, res, next) => {
  if (req.path.split('/').some((segment) => segment.startsWith('.') && segment.length > 1)) {
    return res.status(404).end();
  }
  next();
});

// Build PG configuration (support DATABASE_URL or discrete DB_* vars)
// Build PG configuration (Optimized for Supabase Free Tier Pooler)
const buildPgConfig = () => {
  // If DATABASE_URL is provided, use it (for production/Supabase)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    };
  }

  // Otherwise, use discrete environment variables (for local development)
  const dbUser = process.env.DB_USER;
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbPort = process.env.DB_PORT || 5432;

  if (!dbUser || !dbHost || !dbName || !dbPassword) {
    throw new Error("Missing required database environment variables. Either set DATABASE_URL or set DB_USER, DB_HOST, DB_NAME, and DB_PASSWORD");
  }

  return {
    user: dbUser,
    host: dbHost,
    database: dbName,
    password: dbPassword,
    port: parseInt(dbPort, 10),
    max: 10,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  };
};

const pgConfig = buildPgConfig();
const pool = new Pool(pgConfig);

// This is crucial: It catches errors on clients that are sitting in the pool
pool.on('error', (err) => {
  logger.error('Unexpected PG pool error:', err.message);
});

// Force-destroy clients that encounter socket errors
pool.on('connect', (client) => {
  client.on('error', (err) => {
    logger.error('Socket error detected, destroying client:', err.message);
    client.release(true); // 'true' destroys the client immediately
  });
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

// Small helper to mask sensitive values for logs
const mask = (s) => {
  if (!s) return 'N/A';
  if (s.length <= 6) return '***';
  return s.slice(0, 3) + '***' + s.slice(-3);
};

// Test DB connection quickly on startup (non-fatal, but informative)
(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1'); // simple test
      logger.info('Postgres connection test succeeded', {
        host: mask(process.env.DB_HOST),
        user: mask(process.env.DB_USER),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    // Do NOT log secrets. Provide actionable info.
    logger.error('Postgres connection test FAILED. Check DB credentials and SSL settings.', {
      message: err.message,
      code: err.code,
      hint: 'If you use Render or Supabase, ensure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT are set in Render env and ssl is enabled.'
    });
    // keep server running so logs are visible, but DB queries will fail until config corrected
  }
})();

// Middleware and basic app setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1);

const staticOptions = {
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
};
app.use(express.static(path.join(__dirname, 'dist'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));

app.use(session({
  // Keep server-side session alive for the same duration as the cookie (30 days)
  // store: new pgSession({ pool: pool, ttl: 30 * 24 * 60 * 60 }),
  secret: process.env.SESSION_SECRET || 'your-very-secure-secret-key-please-change',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // Extend maxAge to 30 days so users stay signed in unless they log out
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // Always prevent JavaScript access to the session cookie (MED-01)
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
}));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, gif) are allowed'));
    }
  },
});

// Helper to require route factory safely
const initializeRoute = (filePath, poolInstance) => {
  try {
    const routeFactory = require(filePath);
    if (typeof routeFactory !== 'function') {
      logger.error(`FATAL: Route factory in ${filePath} is not a function. Exiting.`);
      process.exit(1);
    }
    return routeFactory(poolInstance);
  } catch (e) {
    logger.error(`FATAL: Failed to require or initialize route from ${filePath}: ${e.message}`);
    process.exit(1);
  }
};

// Routes import/initialization
const {
  createOwnerAuthRouter,
  authenticateOwner,
  authenticateOwnerOrStaff,
  ensureOwnerDataIsolation,
  ensureDataIsolation,
} = require("./routes/ownerAuth");
const { createStudentAuthRouter } = require("./routes/studentAuth");
const { createOwnerDashboardRouter } = require('./routes/ownerDashboard');
const { validateSubscription, updateOwnerSubscriptionInfo } = require('./routes/subscriptionValidation');

const ownerAuthRoutes = createOwnerAuthRouter(pool);
const studentAuthRoutes = createStudentAuthRouter(pool);
const ownerDashboardRoutes = createOwnerDashboardRouter(pool);

const userRoutes = initializeRoute('./routes/users', pool);
const studentRoutes = initializeRoute('./routes/students', pool);
const scheduleRoutes = initializeRoute('./routes/schedules', pool);
const seatsRoutes = initializeRoute('./routes/seats', pool);
const settingsRoutes = initializeRoute('./routes/settings', pool);
const hostelBranchesRoutes = initializeRoute('./routes/hostelBranches', pool);
const hostelStudentsRoutes = initializeRoute('./routes/hostelStudents', pool);
const transactionsRoutes = initializeRoute('./routes/transactions', pool);
const advancePaymentsRoutes = initializeRoute('./routes/advancePayments', pool);
const generalCollectionsRoutes = initializeRoute('./routes/collections', pool);
const expensesRoutes = initializeRoute('./routes/expenses', pool);
const reportsRoutes = initializeRoute('./routes/reports', pool);
const hostelCollectionRoutes = initializeRoute('./routes/hostelCollections', pool);
const branchesRoutes = initializeRoute('./routes/branches', pool);
const productsRoutes = initializeRoute('./routes/products', pool);
const lockersRoutes = initializeRoute('./routes/lockers', pool);
const announcementsRoutes = initializeRoute('./routes/announcements', pool);
const queriesRoutes = initializeRoute('./routes/queries', pool);
const publicRegistrationRoutes = initializeRoute('./routes/publicRegistration', pool);
const admissionRequestsRoutes = initializeRoute('./routes/admissionRequests', pool);
const authModule = require('./routes/auth');
const authRoutes = authModule.authRouter(pool);

// Rate limiting for authentication endpoints to slow brute-force attacks (MED-02)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Mount routes
app.use('/api/owner-auth', authLimiter, ownerAuthRoutes);
app.use('/api/student-auth', authLimiter, studentAuthRoutes);
app.use(
  '/api/owner-dashboard',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  ownerDashboardRoutes
);

app.use('/api/public-registration', publicRegistrationRoutes);
app.use('/api/admission-requests', admissionRequestsRoutes);
app.use('/api/auth', authLimiter, authRoutes);

app.use(
  '/api/users',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  userRoutes
);
// Announcements route is mounted with owner/auth/subscription guards below
app.use('/api/queries', queriesRoutes);
app.use(
  '/api/students',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  studentRoutes
);
app.use(
  '/api/schedules',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  scheduleRoutes
);
app.use(
  '/api/seats',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  seatsRoutes
);
app.use(
  '/api/branches',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  branchesRoutes
);
app.use(
  '/api/lockers',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  lockersRoutes
);

const { createSubscriptionRouter } = require('./routes/subscriptions');
const subscriptionRoutes = createSubscriptionRouter(pool);
app.use('/api/subscriptions', subscriptionRoutes);

app.use(
  '/api/transactions',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  transactionsRoutes
);
app.use(
  '/api/advance-payments',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  advancePaymentsRoutes
);
app.use(
  '/api/collections',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  generalCollectionsRoutes
);
app.use(
  '/api/expenses',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  expensesRoutes
);
app.use(
  '/api/reports',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  reportsRoutes
);
app.use(
  '/api/hostel/branches',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  hostelBranchesRoutes
);
app.use(
  '/api/hostel/students',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  hostelStudentsRoutes
);
app.use(
  '/api/hostel/collections',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  hostelCollectionRoutes
);
app.use(
  '/api/products',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  productsRoutes
);
app.use(
  '/api/settings',
  authenticateOwnerOrStaff,
  ensureDataIsolation,
  updateOwnerSubscriptionInfo.bind(null, pool),
  validateSubscription,
  settingsRoutes
);
// Announcements route allows any authenticated user (owner, admin, staff, student)
app.use('/api/announcements', announcementsRoutes);

const googlePlayRouter = require('./routes/googlePlaySubscriptions');
app.use('/api/subscriptions/google-play', googlePlayRouter);

// RevenueCat (Android subscriptions) – on-demand sync + webhook receiver.
const { createRevenueCatRouter } = require('./routes/revenueCatSubscriptions');
app.use('/api/subscriptions/revenuecat', createRevenueCatRouter(pool));

app.get('/api/test-email', authenticateOwnerOrStaff, async (req, res) => {
  try {
    const settingsResult = await pool.query("SELECT value FROM settings WHERE key = 'brevo_template_id'");
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].value) {
      return res.status(400).json({ message: 'Brevo template ID not set in settings' });
    }
    const brevoTemplateId = parseInt(settingsResult.rows[0].value);
    if (isNaN(brevoTemplateId)) {
      return res.status(400).json({ message: 'Brevo template ID is not a valid number in settings' });
    }
    const testStudent = { email: 'test@example.com', name: 'Test Student', membership_end: '2025-12-31' };
    await sendExpirationReminder(testStudent, brevoTemplateId);
    res.json({ message: 'Test email initiated (check Brevo logs/test email inbox)' });
  } catch (err) {
    logger.error('Error in test-email endpoint:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Student Management API' });
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    logger.error('Index.html not found in dist folder. Path searched:', indexPath);
    res.status(404).send('Application resource not found. Please ensure the frontend is built and `dist/index.html` exists.');
  }
});

app.use((err, req, res, next) => {
  // Handle CORS rejections explicitly
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, path: req.path, method: req.method });
  // Do not leak internal error details/stack traces to clients in production (HIGH-03)
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    message: 'Internal Server Error',
    ...(isProd ? {} : { error: err.message }),
  });
});

// DB helper functions (unchanged logic)
async function initializeSessionTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);`);
    const pkeyCheck = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'session'::regclass AND conrelid::oid IN (
        SELECT oid FROM pg_class WHERE relname = 'session' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ) AND contype = 'p';
    `);
    if (pkeyCheck.rows.length === 0) {
      await pool.query(`ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`);
    }
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
    logger.info('Session table checked/initialized successfully');
  } catch (err) {
    logger.error('Error initializing session table:', err.stack);
    // ignore expected duplicate/index errors (keeps startup resilient)
    if (err.code !== '42P07' && err.code !== '42710') {
      // other errors will still be logged
    } else {
      logger.warn(`Session table or its constraints/indexes might already exist: ${err.message}`);
    }
  }
}

async function createDefaultAdmin() {
  try {
    const usersTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE   table_schema = 'public'
        AND     table_name   = 'users'
      );
    `);
    if (!usersTableExists.rows[0].exists) {
        logger.warn('Users table does not exist yet. Default admin cannot be created. Please run migrations/schema setup.');
        return;
    }

    const userCountResult = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (parseInt(userCountResult.rows[0].count) === 0) {
      const plainPassword = process.env.DEFAULT_ADMIN_PASSWORD;
      if (!plainPassword) {
        logger.warn('No admin users found and DEFAULT_ADMIN_PASSWORD is not set. Skipping default admin creation. Set a strong DEFAULT_ADMIN_PASSWORD to seed an admin.');
        return;
      }
      const hashedPassword = await hashPassword(plainPassword);
      await pool.query(
        'INSERT INTO users (username, password, role, full_name, email) VALUES ($1, $2, $3, $4, $5)',
        [process.env.DEFAULT_ADMIN_USERNAME || 'admin', hashedPassword, 'admin', 'Default Admin', 'admin@example.com']
      );
      logger.info('Default admin user created.');
    } else {
      logger.info('Admin user(s) already exist, skipping default admin creation.');
    }
  } catch (err) {
    logger.error('Error creating default admin user:', err.stack);
    if (err.code === '42P01') {
      logger.warn('Users table does not exist yet (checked again). Default admin cannot be created.');
    } else {
      // ignore unique violation log noise
    }
  }
}

// Single server start; cron jobs started in same process
(async () => {
  try {
    // await initializeSessionTable();
    await createDefaultAdmin();

    // start cron jobs with pool so cron queries work
    if (typeof setupCronJobs === 'function') {
      // setupCronJobs(pool);
    } else {
      logger.warn('setupCronJobs is not a function, cron jobs not started.');
    }

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 70000;
  } catch (err) {
    logger.error('Failed to start server:', err.stack);
    process.exit(1);
  }
})();
