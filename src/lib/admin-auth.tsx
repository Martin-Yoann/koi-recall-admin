'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { staffLogin, staffLogout, updateOwnProfile, setAdminSessionToken } from '@/lib/api-client';

interface AdminUser {
  email: string;
  name: string;
  initials?: string;
  avatarBg?: string;
  /** Base64 data URL of uploaded avatar image. When set, it replaces initials+color rendering. */
  avatarDataUrl?: string;
  /** Bearer session token for the Admin API (persisted so reloads stay logged in) */
  token?: string;
  /** ISO expiry of the session token */
  expiresAt?: string;
}

interface AuthCtx {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; initials?: string; avatarBg?: string; avatarDataUrl?: string | null }) => void;
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

function getStored(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStored(user: AdminUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

function getInitials(name: string): string {
  // Take first char of first word + first char of last word
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    const stored = getStored();
    if (stored?.token && stored.expiresAt && new Date(stored.expiresAt).getTime() > Date.now()) {
      // Session still valid — restore the API token so calls survive reloads
      setAdminSessionToken(stored.token);
      setUser(stored);
    } else if (stored) {
      // Expired session — force re-login
      clearStored();
      setAdminSessionToken(null);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await staffLogin({ email, password });

    if (result.ok) {
      const apiName = result.data.displayName;
      const displayName = apiName && apiName.length > 0 ? apiName : (email.split('@')[0] ?? 'Admin');
      const u: AdminUser = {
        email,
        name: displayName,
        initials: getInitials(displayName),
        avatarBg: '#0D9488',
        token: result.data.token,
        expiresAt: result.data.expiresAt,
        ...(result.data.avatarDataUrl ? { avatarDataUrl: result.data.avatarDataUrl } : {}),
      };
      setStored(u);
      setUser(u);
      setLoginOpen(false);
      return { ok: true };
    }

    if (result.status === 401 || result.status === 403) {
      return { ok: false, error: 'Invalid email or password' };
    }
    if (result.status === 0) {
      return { ok: false, error: 'Cannot reach the server. Is the backend running?' };
    }
    return { ok: false, error: result.error?.detail || 'Login failed' };
  }, []);

  const logout = useCallback(async () => {
    await staffLogout().catch(() => {});
    setAdminSessionToken(null);
    clearStored();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (data: { name?: string; initials?: string; avatarBg?: string; avatarDataUrl?: string | null }) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated: AdminUser = { ...prev };
        if (data.name !== undefined) updated.name = data.name;
        if (data.initials !== undefined) updated.initials = data.initials;
        if (data.avatarBg !== undefined) updated.avatarBg = data.avatarBg;
        if (data.avatarDataUrl !== undefined) {
          if (data.avatarDataUrl === null) {
            delete updated.avatarDataUrl;
          } else {
            updated.avatarDataUrl = data.avatarDataUrl;
          }
        }
        setStored(updated);

        // Fire-and-forget: sync to backend database
        updateOwnProfile({
          displayName: data.name,
          avatarDataUrl: data.avatarDataUrl,
        }).catch(() => {
          // Local storage already updated — API sync is best-effort
        });

        return updated;
      });
    },
    [],
  );

  const changePassword = useCallback(
    (_current: string, _newPw: string) => {
      return { ok: false, error: 'Password change not yet available via API' };
    },
    [],
  );

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const openProfile = useCallback(
    (tab: 'profile' | 'password' = 'profile') => {
      setProfileTab(tab);
      setProfileOpen(true);
    },
    [],
  );
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  return (
    <AdminAuthCtx.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: loading,
        login,
        logout,
        updateProfile,
        changePassword,
        loginOpen,
        openLogin,
        closeLogin,
        profileOpen,
        profileTab,
        openProfile,
        closeProfile,
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
