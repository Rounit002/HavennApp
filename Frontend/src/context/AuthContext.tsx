import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { authFetch } from '../utils/apiConfig';
import { logOut as rcLogOut } from '../services/revenueCatService';

interface User {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  libraryId?: number; // For owners - their library ID
  libraryCode?: string; // For owners - their library code
  isOwner?: boolean; // Flag to identify owners
  is_trial?: boolean; // Subscription trial status
  subscription_start_date?: string; // Subscription start date
  subscription_end_date?: string; // Subscription end date
  subscription_plan?: string; // Current subscription plan
  is_subscription_active?: boolean; // Whether subscription is active
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // ✅ NEW
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  isLoading: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NEW FUNCTION: Refresh user session via /auth/refresh
  const refreshUser = async () => {
    try {
      const resp = await authFetch('/auth/refresh');
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          console.log('[AuthContext] Authentication failed on refresh');
          setUser(null);
        }
        return;
      }
      const data = await resp.json();
      const refreshedUser = data?.user || data?.owner || null;
      if (refreshedUser) {
        refreshedUser.permissions = refreshedUser.permissions || [];
        setUser(refreshedUser);
        try { localStorage.setItem('user', JSON.stringify(refreshedUser)); } catch {}
        console.log('[AuthContext] Session refreshed:', refreshedUser);
      } else {
        console.warn('[AuthContext] No user data in refresh response');
        // Don't automatically logout - might be a temporary server issue
      }
    } catch (err: any) {
      console.error('[AuthContext] Failed to refresh session:', err);
      // Only logout on specific auth errors (401, 403), not network/server errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[AuthContext] Authentication failed, logging out');
        setUser(null);
      }
      // For other errors (network, 500, etc.), keep user logged in
    }
  };

  // Listen for subscription updates triggered from purchase flows
  useEffect(() => {
    const handler = async () => {
      try {
        await refreshUser();
      } catch (e) {
        console.warn('[AuthContext] Failed to refresh after subscription update', e);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).addEventListener('subscription:updated', handler);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).removeEventListener('subscription:updated', handler);
    };
  }, [refreshUser]);

  useEffect(() => {
    let inFlight = false;

    const checkAuth = async (isInitialLoad: boolean) => {
      if (inFlight) {
        return; // avoid overlapping checks
      }
      inFlight = true;
      if (isInitialLoad) {
        setIsLoading(true);
      }

      // If offline, skip checks and preserve current session
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[AuthContext] Offline detected. Skipping auth check and preserving session.');
        if (isInitialLoad) setIsLoading(false);
        return;
      }

      let foundUser: User | null = null;
      let explicitUnauth = false; // true only when backend explicitly says 401/403
      let hadNetworkIssue = false; // network/timeout/server issues

      try {
        // Check owner authentication first (do not throw out user on network failure)
        try {
          const ownerResponse = await authFetch('/owner-auth/status');
          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            if (ownerData.isAuthenticated && ownerData.owner) {
              // Fetch subscription information for the owner
              let subscriptionInfo = {} as Partial<User>;
              try {
                const subscriptionResponse = await authFetch('/subscriptions/status');
                if (subscriptionResponse.ok) {
                  const subscriptionData = await subscriptionResponse.json();
                  subscriptionInfo = {
                    is_trial: subscriptionData.subscription.isTrial,
                    subscription_start_date: subscriptionData.subscription.startDate,
                    subscription_end_date: subscriptionData.subscription.endDate,
                    subscription_plan: subscriptionData.subscription.plan,
                    is_subscription_active: subscriptionData.subscription.isActive,
                  };
                }
              } catch (subscriptionError) {
                console.warn('[AuthContext] Failed to fetch subscription info:', subscriptionError);
              }

              const ownerAsUser: User = {
                id: ownerData.owner.id.toString(),
                username: ownerData.owner.ownerName,
                role: 'admin',
                permissions: [
                  'view_dashboard', 'manage_students', 'manage_memberships',
                  'view_reports', 'manage_seats', 'manage_shifts',
                  'manage_hostel', 'manage_transactions', 'manage_expenses',
                  'manage_products', 'manage_lockers_or_staff', 'manage_branches',
                  'manage_users'
                ],
                libraryId: ownerData.owner.id,
                libraryCode: ownerData.owner.libraryCode,
                isOwner: true,
                ...(subscriptionInfo as User),
              };
              foundUser = ownerAsUser;
            } else if (ownerResponse.status === 401 || ownerResponse.status === 403) {
              explicitUnauth = true;
            }
          } else if (ownerResponse.status === 401 || ownerResponse.status === 403) {
            explicitUnauth = true;
          }
        } catch (err) {
          console.warn('[AuthContext] Owner status check failed (network/server):', err);
          hadNetworkIssue = true;
        }

        // If no owner identified, check for admin/staff
        if (!foundUser) {
          try {
            const data = await api.checkAuthStatus();
            if (data && data.isAuthenticated && data.user) {
              const userWithPermissions = { ...data.user, permissions: data.user.permissions || [] };
              foundUser = userWithPermissions as User;
            }
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
              explicitUnauth = true;
            } else {
              hadNetworkIssue = true;
              console.warn('[AuthContext] Admin/staff status check failed (network/server):', err);
            }
          }
        }

        // If still no user, check for student
        if (!foundUser) {
          try {
            const studentResponse = await authFetch('/student-auth/status');
            if (studentResponse.ok) {
              const studentData = await studentResponse.json();
              if (studentData.isAuthenticated && studentData.student) {
                const studentAsUser: User = {
                  id: studentData.student.id.toString(),
                  username: studentData.student.name,
                  role: 'student',
                  permissions: [],
                  libraryId: studentData.student.library_id,
                };
                foundUser = studentAsUser;
              }
            } else if (studentResponse.status === 401 || studentResponse.status === 403) {
              explicitUnauth = true;
            }
          } catch (err) {
            hadNetworkIssue = true;
            console.warn('[AuthContext] Student status check failed (network/server):', err);
          }
        }

        // Apply result: only clear session on explicit unauth; preserve on network/server issues
        if (foundUser) {
          setUser(foundUser);
        } else if (explicitUnauth) {
          setUser(null);
        } else if (hadNetworkIssue) {
          console.warn('[AuthContext] Auth check encountered network/server issue. Preserving current session.');
        } else {
          // No user found but also no network issue reported — treat as unauthenticated (initial load case)
          setUser(null);
        }
      } catch (error) {
        console.error('Error during auth check (outer):', error);
        // Preserve current user on unexpected errors
      } finally {
        inFlight = false;
        if (isInitialLoad) {
          setIsLoading(false);
        }
      }
    };

    checkAuth(true); // Initial check with loading state
    const intervalId = setInterval(() => checkAuth(false), 60000); // Subsequent checks without loading state

    const handleOnline = () => {
      console.log('[AuthContext] Network online - refreshing session');
      refreshUser();
    };
    const handleOffline = () => {
      console.warn('[AuthContext] Network offline - preserving current session');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  const login = (user: User) => {
    user.permissions = user.permissions || [];
    setUser(user);
    try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (user) {
        if (user.isOwner) {
          // Owner logout
          await authFetch('/owner-auth/logout', { method: 'POST' });
        } else if (user.role === 'student') {
          // Student logout
          await authFetch('/student-auth/logout', { method: 'POST' });
        } else {
          // Admin/staff logout
          await api.logout();
        }
      }
      setUser(null);
      try { localStorage.removeItem('user'); } catch {}
      // Clear the RevenueCat identity so the next user starts clean (Cordova only).
      try { await rcLogOut(); } catch {}
      // Redirect to landing page after logout
      window.location.href = '/#/'; 
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        logout,
        refreshUser, // ✅ Provide function to components
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

