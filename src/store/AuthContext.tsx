import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  theme: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_MS = 1000 * 60 * 60;

const getLastActivity = () => Number(localStorage.getItem('lastActivity') || '0');
const setLastActivity = () => localStorage.setItem('lastActivity', Date.now().toString());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
  }, []);

  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'admin') return true; // Admin has full access
    const userPerms = user.permissions || [];
    return userPerms.includes(permissionKey);
  }, [user]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const lastActivity = getLastActivity();
      if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
        logout();
      } else {
        setLastActivity();
      }
    }

    setLoading(false);
  }, [logout]);

  useEffect(() => {
    if (!token) return;

    const refreshActivity = () => setLastActivity();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    events.forEach((event) => window.addEventListener(event, refreshActivity));

    const intervalId = window.setInterval(() => {
      if (Date.now() - getLastActivity() > SESSION_TIMEOUT_MS) {
        logout();
      }
    }, 60_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, refreshActivity));
      window.clearInterval(intervalId);
    };
  }, [token, logout]);

  const login = async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    const { token: newToken, user: newUser } = response.data;
    
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setLastActivity();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
