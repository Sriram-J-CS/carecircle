import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole } from '../types/api';
import { getToken, setToken, getStoredUser, setStoredUser, api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUserState] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const idleTimerRef = useRef<number | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUserState(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setStoredUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setStoredUser(updated);
    setUserState(updated);
  }, []);

  // Sync / Verify with backend on initial load
  useEffect(() => {
    async function checkAuth() {
      const storedToken = getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await api.getMe();
        setUserState(freshUser);
        setStoredUser(freshUser);
      } catch (err: any) {
        if (err.status === 401) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [logout]);

  // Idle Auto-Logout for Doctor & Relative roles (15 minutes)
  useEffect(() => {
    if (!user || user.role === 'patient') {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
