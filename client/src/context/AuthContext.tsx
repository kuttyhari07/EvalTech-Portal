import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { User, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  studentLogin: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data.user);
        setOrganization(res.data.data.organization || null);
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch {
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.success) {
      setUser(res.data.data.user);
      await refreshUser();
    }
  };

  const studentLogin = async (credentials: { username: string; password: string }) => {
    const res = await api.post('/auth/student-login', credentials);
    if (res.data?.success) {
      setUser(res.data.data.user);
      await refreshUser();
    }
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    if (res.data?.success) {
      setUser(res.data.data.user);
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        studentLogin,
        register,
        logout,
        refreshUser,
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
