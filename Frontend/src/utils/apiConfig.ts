// Centralized API URL configuration utility
export const getApiUrl = () => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || 
                       (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  
  // For mobile apps (Cordova/Capacitor), always use production URL
  const isMobileApp = typeof navigator !== 'undefined' && 
                     (navigator.userAgent.includes('Cordova') || 
                      navigator.userAgent.includes('Capacitor') ||
                      (typeof window !== 'undefined' && window.location.protocol === 'file:'));
  
  if (isMobileApp) {
    return 'https://havenn.onrender.com/api';
  }
  
  if (isDevelopment) {
    // Use relative path so Vite dev proxy forwards to backend and cookies remain same-site
    return '/api';
  }
  
  return 'https://havenn.onrender.com/api';
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
