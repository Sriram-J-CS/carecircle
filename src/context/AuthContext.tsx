import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, LoginIn, RegisterIn } from '../types/api';
import { authApi, getToken, getStoredUser, setToken, setStoredUser } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginIn) => Promise<User>;
  faceLogin: (descriptor: number[]) => Promise<User>;
  register: (data: RegisterIn) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getDashboardPath: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getDashboardPathForRole = (role?: UserRole): string => {
  switch (role) {
    case 'patient':
      return '/home';
    case 'relative':
      return '/family';
    case 'doctor':
      return '/doctor';
    default:
      return '/login';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Sync / verify user session on mount
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      const storedToken = getToken();
      if (storedToken) {
        try {
          const freshUser = await authApi.me();
          if (isMounted) {
            setUser(freshUser);
            setStoredUser(freshUser);
          }
        } catch (err: any) {
          // Token invalid or expired
          if (isMounted) {
            setUser(null);
            setTokenState(null);
            setToken(null);
            setStoredUser(null);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setStoredUser(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    }

    initAuth();

    const handleAuthExpired = () => {
      setUser(null);
      setTokenState(null);
      setToken(null);
      setStoredUser(null);
      toast.error('Session expired. Please sign in again.');
    };

    window.addEventListener('carecircle-auth-expired', handleAuthExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('carecircle-auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (data: LoginIn): Promise<User> => {
    const res = await authApi.login(data);
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const faceLogin = async (descriptor: number[]): Promise<User> => {
    const res = await authApi.faceLogin(descriptor);
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: RegisterIn): Promise<User> => {
    const res = await authApi.register(data);
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.me();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch (e) {
      console.warn('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        faceLogin,
        register,
        logout,
        refreshUser,
        getDashboardPath: (role) => getDashboardPathForRole(role || user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
