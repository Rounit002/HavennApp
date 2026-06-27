/**
 * Platform detection utilities for Havenn frontend.
 * Plain TypeScript module (no React dependencies) to be used anywhere.
 */

/**
 * Determine whether code is running in a browser-like environment.
 */
const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Heuristic to determine if the UA string looks like a desktop browser.
 * Used as a safety check to avoid false positives on desktop.
 */
function isLikelyDesktopUA(ua: string): boolean {
  const hasDesktopToken = /(Windows NT|Macintosh|Mac OS X|X11; Linux x86_64)/i.test(ua);
  const hasMobileToken = /(Android|iPhone|iPad|iPod|Mobile)/i.test(ua);
  return hasDesktopToken && !hasMobileToken;
}

/**
 * True when this page is the locally-bundled Cordova app shell.
 *
 * The UI is bundled INSIDE the APK and served by cordova-android from
 * `https://localhost` (no port); older builds use `file://`. We detect the app
 * purely by its ORIGIN — NOT by `window.cordova` — because `window.cordova` is
 * defined asynchronously by cordova.js and may not exist yet when this module is
 * first evaluated. The origin, by contrast, is known synchronously and never
 * changes, so there is no race.
 *
 * The public web build (https://havennapp.onrender.com) and the Vite dev server
 * (localhost:5173 etc.) both have a different origin, so they correctly resolve
 * to web.
 */
function isLocalAppShellOrigin(): boolean {
  if (!hasDOM) return false;
  const loc = window.location;
  if (loc.protocol === 'file:') return true;
  return (
    (loc.protocol === 'https:' || loc.protocol === 'http:') &&
    loc.hostname === 'localhost' &&
    (loc.port === '' || loc.port === '0')
  );
}

const notDesktopUA = hasDOM ? !isLikelyDesktopUA(navigator.userAgent || '') : true;

/**
 * Boolean indicating if the app is running inside the Cordova Android WebView.
 *
 * Checks used:
 * - The page origin is the locally-bundled app shell (file:// or https://localhost)
 * - The user agent does not look like a desktop browser (safety check)
 */
export const isCordova: boolean = Boolean(isLocalAppShellOrigin() && notDesktopUA);

/**
 * Boolean indicating if the app is running in a regular web browser.
 */
export const isWeb: boolean = !isCordova;

/**
 * Get the current platform string ('cordova' | 'web').
 */
export function getPlatform(): 'cordova' | 'web' {
  return isCordova ? 'cordova' : 'web';
}

/**
 * Execute a callback when Cordova is fully ready.
 * - In Cordova: waits for the 'deviceready' event before executing.
 * - In Web: executes the callback immediately for a unified API.
 */
export function onCordovaReady(callback: () => void): void {
  if (isCordova && hasDOM) {
    const once = () => {
      document.removeEventListener('deviceready', once as any);
      try {
        callback();
      } catch {
        // swallow to avoid crashing caller from within event handler
      }
    };
    document.addEventListener('deviceready', once as any, false);
  } else {
    // Call immediately on web for easier testing
    try {
      // Use microtask to keep behavior async-ish
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(callback);
      } else {
        Promise.resolve().then(callback).catch(() => callback());
      }
    } catch {
      callback();
    }
  }
}

// Provide TypeScript declaration for window.cordova
declare global {
  interface Window {
    cordova?: Cordova;
  }
}

export {};

