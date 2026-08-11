'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminUser {
  email: string;
  name: string;
  initials?: string;
  avatarBg?: string;
}

interface AuthCtx {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: { name?: string; initials?: string; avatarBg?: string }) => void;
  changePassword: (current: string, newPw: string) => { ok: boolean; error?: string };
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  profileOpen: boolean;
  profileTab: 'profile' | 'password';
  openProfile: (tab?: 'profile' | 'password') => void;
  closeProfile: () => void;
}

const AdminAuthCtx = createContext<AuthCtx | undefined>(undefined);

const STORAGE_KEY = 'koi_admin_session';

const MOCK_CREDS: (AdminUser & { password: string })[] = [
  { email: 'admin@koi-platform.com', password: 'admin123', name: 'Admin User', initials: 'AU', avatarBg: '#0D9488' },
  { email: 'operator@koi-platform.com', password: 'ops2026', name: 'Operations Lead', initials: 'OL', avatarBg: '#6366F1' },
];

function getStored(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setStored(user: AdminUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    setUser(getStored());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const match = MOCK_CREDS.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    );
    if (match) {
      const u: AdminUser = {
        email: match.email,
        name: match.name,
        initials: match.initials,
        avatarBg: match.avatarBg,
      };
      setStored(u);
      setUser(u);
      setLoginOpen(false);
      return { ok: true };
    }
    return { ok: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    clearStored();
    setUser(null);
  }, []);

  const updateProfile = useCallback((data: { name?: string; initials?: string; avatarBg?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      setStored(updated);
      // Also update mock store so password change is remembered
      const mock = MOCK_CREDS.find((c) => c.email.toLowerCase() === prev.email.toLowerCase());
      if (mock) {
        if (data.name) mock.name = data.name;
        if (data.initials) mock.initials = data.initials;
        if (data.avatarBg) mock.avatarBg = data.avatarBg;
      }
      return updated;
    });
  }, []);

  const changePassword = useCallback((current: string, newPw: string) => {
    if (!user) return { ok: false, error: 'Not authenticated' };
    const mock = MOCK_CREDS.find((c) => c.email.toLowerCase() === user.email.toLowerCase());
    if (!mock || mock.password !== current) {
      return { ok: false, error: 'Current password is incorrect' };
    }
    if (newPw.length < 6) return { ok: false, error: 'New password must be at least 6 characters' };
    mock.password = newPw;
    return { ok: true };
  }, [user]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const openProfile = useCallback((tab: 'profile' | 'password' = 'profile') => { setProfileTab(tab); setProfileOpen(true); }, []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  return (
    <AdminAuthCtx.Provider
      value={{
        user, isAuthenticated: !!user, isLoading: loading,
        login, logout, updateProfile, changePassword,
        loginOpen, openLogin, closeLogin,
        profileOpen, profileTab, openProfile, closeProfile,
      }}
    >
      {children}
    </AdminAuthCtx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
