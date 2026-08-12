import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export interface User {
  sub: string;
  email: string;
  tenantId: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MEMBER';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (tenantName: string, tenantSlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        setUser(decoded);
      } else {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const decoded = parseJwt(data.accessToken);
    setUser(decoded);
  };

  const register = async (
    tenantName: string,
    tenantSlug: string,
    email: string,
    password: string,
  ) => {
    const { data } = await api.post('/auth/register', {
      tenantName,
      tenantSlug,
      email,
      password,
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const decoded = parseJwt(data.accessToken);
    setUser(decoded);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort server notification; local tokens are cleared unconditionally below.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
