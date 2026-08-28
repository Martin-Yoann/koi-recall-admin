'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { staffLogin, staffLogout, updateOwnProfile, setAdminSessionToken, type StaffRole } from '@/lib/api-client';

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
  /** Fixed staff role from the login response — drives client-side RBAC UI. */
  role?: StaffRole;
  /** Staff user id (uuid) — used for self-assignment ("claim to me"). */
  staffUserId?: string;
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

  // Restore the staff session before child pages issue authenticated requests.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AdminUser;
      if (!parsed.token || (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now())) {
        clearStored();
        return;
      }
      setAdminSessionToken(parsed.token);
      window.setTimeout(() => setUser(parsed), 0);
    } catch {
      clearStored();
    } finally {
      window.setTimeout(() => setLoading(false), 0);
    }
  }, []);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');

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
        ...(result.data.role ? { role: result.data.role } : {}),
        ...(result.data.staffUserId ? { staffUserId: result.data.staffUserId } : {}),
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

  // The backend currently exposes staff creation and role/status updates, but
  // no self-service password-change endpoint. Keep this explicit rather than
  // pretending that the profile form can persist a password.
  const changePassword = useCallback(
    () => ({ ok: false, error: 'Password changes are not available until the backend endpoint is enabled.' }),
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
