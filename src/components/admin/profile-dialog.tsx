/* eslint-disable @next/next/no-img-element */

'use client';

import { useState, useRef } from 'react';
import { Button, Input } from 'antd';
import { X, Check, User, Lock, Camera, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/admin-auth';
import { useToast } from '@/components/ui/toast';
import { ADMIN_THEME_STORAGE_KEY, DEFAULT_ADMIN_THEME } from '@/lib/admin-constants';

/** Admin theme presets. Persisted and broadcast via `koi_admin_theme`. */
const THEMES = [
  { label: 'Navy Blue', value: DEFAULT_ADMIN_THEME },
  { label: 'Midnight', value: '#052745' },
  { label: 'Emerald', value: '#006C49' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Rose', value: '#E11D48' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Cyan', value: '#0E7490' },
  { label: 'Slate', value: '#475569' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'password';
}

/** Validate name: max 6 Chinese chars or 12 ASCII chars */
function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Name is required';
  let weight = 0;
  for (const ch of trimmed) {
    weight += /[一-鿿㐀-䶿豈-﫿]/.test(ch) ? 2 : 1;
  }
  if (weight > 12) return 'Name is too long (max 6 Chinese characters or 12 English letters)';
  return null;
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512 KiB

/** First letters of the display name — computed, never editable. */
function computeInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileDialog({ open, onClose, initialTab = 'profile' }: Props) {
  const { user, updateProfile, changePassword } = useAdminAuth();

  if (!open || !user) return null;

  return (
    <ProfileDialogContent
      key={`${user.email}-${initialTab}`}
      user={user}
      onClose={onClose}
      initialTab={initialTab}
      updateProfile={updateProfile}
      changePassword={changePassword}
    />
  );
}

interface ProfileDialogContentProps {
  user: NonNullable<ReturnType<typeof useAdminAuth>['user']>;
  onClose: () => void;
  initialTab: 'profile' | 'password';
  updateProfile: ReturnType<typeof useAdminAuth>['updateProfile'];
  changePassword: ReturnType<typeof useAdminAuth>['changePassword'];
}

function ProfileDialogContent({ user, onClose, initialTab, updateProfile, changePassword }: ProfileDialogContentProps) {
  const toast = useToast();
  const [tab, setTab] = useState<'profile' | 'password'>(initialTab);

  const [name, setName] = useState(user.name || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user.avatarDataUrl ?? null);
  // Default avatar background is the brand blue.
  const [avatarBg] = useState<string | null>(user.avatarBg || DEFAULT_ADMIN_THEME);
  const [profileError, setProfileError] = useState('');

  const [currentTheme, setCurrentTheme] = useState(
    typeof window !== 'undefined' ? localStorage.getItem(ADMIN_THEME_STORAGE_KEY) || DEFAULT_ADMIN_THEME : DEFAULT_ADMIN_THEME,
  );

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Broadcast the chosen theme to the global ConfigProvider + persist it. */
  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme);
    try {
      localStorage.setItem(ADMIN_THEME_STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable (private mode) — the in-memory choice still works.
    }
    window.dispatchEvent(new CustomEvent('koi_theme_changed', { detail: newTheme }));
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    const err = validateName(name);
    if (err) {
      setProfileError(err);
      return;
    }
    const n = name.trim();
    const init = computeInitials(n);
    setProfileSaving(true);
    const result = await updateProfile({ name: n, initials: init, avatarBg: currentTheme, avatarDataUrl });
    setProfileSaving(false);
    if (result.ok) {
      toast.success('Profile updated');
      onClose();
    } else {
      setProfileError(result.error || 'Failed to update profile.');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setProfileError('Image must be under 512 KB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setProfileError('Only JPEG, PNG, WebP, or GIF images are supported');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(reader.result as string);
      setProfileError('');
    };
    reader.onerror = () => {
      setProfileError('Failed to read image file');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarDataUrl(null);
  };

  const handleSavePassword = async () => {
    setPwError('');
    if (!currentPw) {
      setPwError('Enter your current password');
      return;
    }
    if (newPw.length < 12) {
      setPwError('New password must be at least 12 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match');
      return;
    }
    setPwSaving(true);
    const result = await changePassword(currentPw, newPw);
    setPwSaving(false);
    if (result.ok) {
      toast.success('Password changed');
      onClose();
    } else {
      setPwError(result.error || 'Failed to change password.');
    }
  };

  const inputStyle = {
    background: '#F3F6F7',
    borderColor: 'rgba(0,53,39,0.08)',
    color: '#131b2e',
  };

  const displayInitials = computeInitials(name || user.name);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close account settings"
        className="fixed inset-0 z-[65] cursor-default bg-black/25 animate-[fadeIn_150ms] motion-reduce:animate-none"
        onClick={onClose}
      />

      {/* Centered dialog */}
      <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-settings-title"
          className="w-full max-w-[440px] max-h-[calc(100vh-2rem)] overflow-hidden overscroll-contain rounded-2xl shadow-2xl animate-[scaleIn_200ms_ease-out] motion-reduce:animate-none"
          style={{ background: '#FFFFFF' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'rgba(0,53,39,0.08)' }}
          >
            <h3 id="account-settings-title" className="text-base font-bold text-[#131b2e]">
              Account Settings
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close account settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Account settings sections" className="flex gap-1 px-4 py-3 border-b" style={{ borderColor: 'rgba(0,53,39,0.08)' }}>
            {(
              [
                { key: 'profile' as const, label: 'Edit Profile', icon: User },
                { key: 'password' as const, label: 'Change Password', icon: Lock },
              ]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                onClick={() => setTab(t.key)}
                aria-selected={tab === t.key}
                tabIndex={tab === t.key ? 0 : -1}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  tab === t.key ? 'text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary',
                )}
                style={tab === t.key ? { background: currentTheme } : undefined}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content — shrinks to fit; no inner scrollbar */}
          <div className="p-5 space-y-4">
            {tab === 'profile' && (
              <>
                {/* Avatar preview */}
                <div className="flex flex-col items-center gap-2.5 pb-3 border-b" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                  <button
                    type="button"
                    aria-label={avatarDataUrl ? 'Change avatar photo' : 'Upload avatar photo'}
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative rounded-full p-0 focus-visible:outline-none"
                  >
                    {avatarDataUrl ? (
                      <img
                        src={avatarDataUrl}
                        alt="Current avatar"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover ring-4 ring-surface-secondary"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-bold ring-4 ring-surface-secondary"
                        style={{ background: avatarBg ?? '#3A86FF' }}
                      >
                        {displayInitials}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      id="avatar-upload"
                      name="avatar"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      aria-label="Upload avatar image"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {avatarDataUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {avatarDataUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-text-primary">{name || user.name}</p>
                  <p className="text-xs text-text-tertiary">{user.email}</p>
                  <p className="text-[10px] text-text-tertiary">Initials are generated automatically</p>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-display-name" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Display Name
                  </label>
                  <Input
                    id="profile-display-name"
                    name="displayName"
                    autoComplete="name"
                    style={inputStyle}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setProfileError('');
                    }}
                    placeholder="Your name…"
                    maxLength={24}
                  />
                  <p className="text-[10px] text-text-tertiary">6 Chinese characters or 12 English letters max</p>
                </div>

                {/* Admin Theme Picker */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Admin Theme
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleThemeChange(t.value)}
                        aria-label={`Switch to ${t.label} theme`}
                        title={t.label}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full transition-[transform,box-shadow] cursor-pointer focus-visible:outline-none',
                          'hover:scale-110 hover:shadow-md active:scale-95',
                          currentTheme === t.value && 'ring-2 ring-offset-2 ring-brand-500',
                        )}
                        style={{ background: t.value }}
                      >
                        {currentTheme === t.value && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-tertiary">
                    Applies to the whole admin interface — buttons, menus and highlights.
                  </p>
                </div>

                {profileError && (
                  <div id="profile-error" role="alert" aria-live="polite" className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
                    {profileError}
                  </div>
                )}

                <Button
                  type="primary"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  loading={profileSaving}
                  className="w-full"
                >
                  Save Changes
                </Button>
              </>
            )}

            {tab === 'password' && (
              <>
                <div className="flex items-center gap-3 p-4 rounded-xl mb-2" style={{ background: 'rgba(0,53,39,0.03)' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <Lock className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Update Password</p>
                    <p className="text-xs text-text-tertiary">Choose a strong password you don&apos;t use elsewhere</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="current-password" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Current Password
                  </label>
                  <Input.Password
                    id="current-password"
                    name="currentPassword"
                    autoComplete="current-password"
                    style={inputStyle}
                    value={currentPw}
                    onChange={(e) => {
                      setCurrentPw(e.target.value);
                      setPwError('');
                    }}
                    placeholder="Enter current password…"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    New Password
                  </label>
                  <Input.Password
                    id="new-password"
                    name="newPassword"
                    autoComplete="new-password"
                    style={inputStyle}
                    value={newPw}
                    onChange={(e) => {
                      setNewPw(e.target.value);
                      setPwError('');
                    }}
                    placeholder="Minimum 12 characters…"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Confirm New Password
                  </label>
                  <Input.Password
                    id="confirm-password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    style={inputStyle}
                    value={confirmPw}
                    onChange={(e) => {
                      setConfirmPw(e.target.value);
                      setPwError('');
                    }}
                    placeholder="Re-enter new password…"
                  />
                </div>

                {pwError && (
                  <div id="password-error" role="alert" aria-live="polite" className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                    <X className="h-4 w-4 shrink-0" />
                    {pwError}
                  </div>
                )}

                <Button type="primary" onClick={handleSavePassword} disabled={pwSaving} loading={pwSaving} className="w-full">
                  Update Password
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
