// Centralized API URL configuration utility
export const getApiUrl = () => {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  // Treat classic dev servers with known ports as development
  const isDevHostPort = hasWindow && (
    (['localhost', '127.0.0.1'].includes(window.location.hostname)) &&
    (['5173', '3000', '4173', '8080'].includes(window.location.port))
  );
  const isDevelopment = Boolean(import.meta.env?.DEV) || isDevHostPort;

  // Detect Cordova/Capacitor WebViews:
  // - file:// protocol (older Cordova)
  // - https://localhost or http://localhost with NO dev ports (Cordova-Android 10+ serves from localhost)
  // - userAgent hints (Cordova/Capacitor/wv)
  const isCordovaLikeOrigin = hasWindow && (
    window.location.protocol === 'file:' ||
    (
      ['http:', 'https:'].includes(window.location.protocol) &&
      window.location.hostname === 'localhost' &&
      (window.location.port === '' || window.location.port === '0')
    )
  );
  const hasMobileUA = hasNavigator && (/Cordova|Capacitor|\bwv\b/i.test(navigator.userAgent || ''));

  const isMobileApp = isCordovaLikeOrigin || hasMobileUA;

  if (isMobileApp) {
    // Always use production base for packaged mobile apps
    return 'https://havennapp.onrender.com/api';
  }

  if (isDevelopment) {
    // Use relative path so Vite dev proxy forwards to backend and cookies remain same-site
    return '/api';
  }

  // Default to production in all other cases
  return 'https://havennapp.onrender.com/api';
};

export const API_BASE_URL = getApiUrl();

// Helper function for making authenticated fetch requests
export const authFetch = (endpoint: string, options: RequestInit = {}) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

