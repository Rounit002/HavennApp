/**
 * Platform detection utilities for Havenn frontend.
 * Plain TypeScript module (no React dependencies) to be used anywhere.
 */

/**
 * Determine whether code is running in a browser-like environment.
 */
const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Safely retrieve the current document URL (or empty string if unavailable).
 */
function getDocumentURL(): string {
  if (!hasDOM) return '';
  try {
    return (document && (document as any).URL) || (window && window.location && window.location.href) || '';
  } catch {
    return '';
  }
}

/**
 * Get a list of known host domains that might be loaded inside Cordova WebView.
 * Priority: environment variable > known production domain fallback.
 */
function getHostedDomains(): string[] {
  const domains: string[] = [];
  // Try to read from common env patterns across bundlers (Vite/CRA/etc.)
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || undefined;
  const procEnv = (typeof process !== 'undefined' && (process as any)?.env) || undefined;

  const envDomain =
    (viteEnv?.VITE_CORDOVA_HOST_DOMAIN as string | undefined) ||
    (viteEnv?.VITE_PUBLIC_HOST as string | undefined) ||
    (viteEnv?.VITE_APP_HOST as string | undefined) ||
    (procEnv?.REACT_APP_CORDOVA_HOST_DOMAIN as string | undefined) ||
    (procEnv?.PUBLIC_URL as string | undefined);

  if (envDomain && typeof envDomain === 'string') {
    domains.push(envDomain);
  }

  // Fallback to known production host for Havenn
  domains.push('havennapp.onrender.com');

  // Deduplicate and clean
  return Array.from(new Set(domains.filter(Boolean)));
}

/**
 * Heuristic to determine if the UA string looks like a desktop browser.
 * Used as an optional safety check to avoid false positives on desktop.
 */
function isLikelyDesktopUA(ua: string): boolean {
  const hasDesktopToken = /(Windows NT|Macintosh|Mac OS X|X11; Linux x86_64)/i.test(ua);
  const hasMobileToken = /(Android|iPhone|iPad|iPod|Mobile)/i.test(ua);
  return hasDesktopToken && !hasMobileToken;
}

const hasCordovaObject = hasDOM && typeof (window as any).cordova !== 'undefined';
const docUrl = getDocumentURL();
const looksLikeCordovaUrl = docUrl.startsWith('file://') || getHostedDomains().some((h) => docUrl.includes(h));
const notDesktopUA = hasDOM ? !isLikelyDesktopUA(navigator.userAgent || '') : true;

/**
 * Boolean indicating if the app is running inside Cordova Android WebView.
 *
 * Checks used:
 * - window.cordova exists
 * - URL is a local file (file://) OR contains a known hosted domain used inside Cordova
 * - User agent does not look like desktop (optional safety check)
 */
export const isCordova: boolean = Boolean(hasCordovaObject && looksLikeCordovaUrl && notDesktopUA);

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
