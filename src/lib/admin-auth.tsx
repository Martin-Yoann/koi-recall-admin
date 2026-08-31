'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  staffLogin,
  staffLogout,
  refreshSession,
  updateOwnProfile,
  updatePassword,
  setAdminSessionToken,
  SESSION_STORAGE_KEY,
  type StaffRole,
} from '@/lib/api-client';

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
  updateProfile: (data: { name?: string; initials?: string; avatarBg?: string; avatarDataUrl?: string | null }) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, newPw: string) => Promise<{ ok: boolean; error?: string }>;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  profileOpen: boolean;
  profileTab: 'profile' | 'password';
  openProfile: (tab?: 'profile' | 'password') => void;
  closeProfile: () => void;
}

const AdminAuthCtx = createContext<AuthCtx | undefined>(undefined);

// Single storage key shared with the api-client (which also writes it during
// session refresh and 401 recovery) — keeping one constant avoids drift.
const STORAGE_KEY = SESSION_STORAGE_KEY;

/**
 * Sessions written by versions before the ADMIN/MANAGER migration may still
 * contain the old UI-only role names. Map only those known roles; the backend
 * remains the authority and refreshes the current role from the staff record.
 */
function normalizeStoredRole(value: unknown): StaffRole | undefined {
  if (value === 'ADMIN' || value === 'administrator') return 'ADMIN';
  if (value === 'MANAGER' || value === 'viewer' || value === 'reviewer' || value === 'compliance') {
    return 'MANAGER';
  }
  return undefined;
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

  // Restore and rotate the staff session before child pages issue authenticated
  // requests. A transient refresh/network failure must not turn into a local
  // logout; only an explicit authentication failure clears the saved session.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      let parsedSession: AdminUser | null = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        parsedSession = JSON.parse(stored) as AdminUser;
        const parsed = parsedSession;
        const role = normalizeStoredRole(parsed.role);
        if (parsed.role !== undefined && !role) {
          clearStored();
          return;
        }
        if (typeof parsed.token !== 'string' || parsed.token.length === 0) {
          clearStored();
          return;
        }

        // The in-memory client token must be set before refreshSession() and
        // before any child page can make an API request.
        setAdminSessionToken(parsed.token);
        const refreshed = await refreshSession();
        if (cancelled) return;

        if (refreshed.ok) {
          const refreshedRole = normalizeStoredRole(refreshed.data.role) ?? role;
          const restored: AdminUser = {
            ...parsed,
            token: refreshed.data.token,
            expiresAt: refreshed.data.expiresAt,
            ...(refreshedRole ? { role: refreshedRole } : {}),
            ...(refreshed.data.staffUserId ? { staffUserId: refreshed.data.staffUserId } : {}),
            ...(refreshed.data.displayName ? { name: refreshed.data.displayName } : {}),
            ...(refreshed.data.avatarDataUrl ? { avatarDataUrl: refreshed.data.avatarDataUrl } : {}),
          };
          if (refreshed.data.displayName) {
            restored.initials = getInitials(refreshed.data.displayName);
          }
          setStored(restored);
          setUser(restored);
          return;
        }

        if (refreshed.status === 401 || refreshed.status === 403) {
          setAdminSessionToken(null);
          clearStored();
          return;
        }

        // Keep the existing session for temporary network/5xx failures. The
        // token may still be valid and the next API request can succeed.
        setUser({ ...parsed, ...(role ? { role } : {}) });
      } catch {
        if (!cancelled && parsedSession) {
          // Keep a syntactically valid session when an unexpected refresh error
          // occurs. Network errors are normally returned by fetchApi, but this
          // guard prevents an exception from becoming an accidental logout.
          setUser(parsedSession);
        } else if (!cancelled) {
          clearStored();
          setAdminSessionToken(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restore();

    /**
     * The api-client owns 401 recovery: it rotates the session and retries,
     * or — when the session is truly dead — removes the stored snapshot and
     * dispatches these events. The provider just mirrors the outcome into
     * React state so the UI always agrees with the request layer.
     */
    const handleExpired = () => {
      setAdminSessionToken(null);
      setUser(null);
    };
    const handleRefreshed = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as AdminUser;
        if (parsed.token) setUser(parsed);
      } catch {
        // ignore malformed storage writes from another tab
      }
    };
    window.addEventListener('koi_admin_session_expired', handleExpired);
    window.addEventListener('koi_admin_session_refreshed', handleRefreshed);
    return () => {
      cancelled = true;
      window.removeEventListener('koi_admin_session_expired', handleExpired);
      window.removeEventListener('koi_admin_session_refreshed', handleRefreshed);
    };
  }, []);
  const [loginOpen] = useState(false);
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

  // Persists profile edits to the backend first; only on success does it
  // update the in-memory session so the dialog can close with confidence.
  const updateProfile = useCallback(
    async (data: { name?: string; initials?: string; avatarBg?: string; avatarDataUrl?: string | null }) => {
      const result = await updateOwnProfile({
        displayName: data.name,
        avatarDataUrl: data.avatarDataUrl,
      }).catch(() => null);
      if (!result?.ok) {
        return { ok: false, error: result && !result.ok ? result.error?.detail : 'Failed to update profile.' };
      }
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
        return updated;
      });
      return { ok: true };
    },
    [],
  );

  const changePassword = useCallback(
    async (current: string, newPw: string) => {
      const result = await updatePassword({ currentPassword: current, newPassword: newPw });
      if (result.ok) {
        // Keep the refresh token flowing so the session stays valid after the
        // password rotation (other sessions were revoked server-side).
        await refreshSession().catch(() => {});
        return { ok: true };
      }
      return { ok: false, error: result.error?.detail || 'Failed to change password.' };
    },
    [],
  );

  // The login drawer is replaced by a dedicated /login page: "open login"
  // now navigates there, and the legacy close is a no-op.
  const openLogin = useCallback(() => {
    window.location.assign('/login');
  }, []);
  const closeLogin = useCallback(() => {}, []);
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
