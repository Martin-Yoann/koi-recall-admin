/* eslint-disable @next/next/no-img-element */

'use client';

import { useState, useRef } from 'react';
import { X, Eye, EyeOff, Check, User, Lock, Camera, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/admin-auth';

const AVATAR_COLORS = [
  { label: 'Teal', value: '#0D9488' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Rose', value: '#E11D48' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Navy', value: '#1E3A5F' },
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
  // Count: CJK characters count as 2, ASCII letters count as 1
  let weight = 0;
  for (const ch of trimmed) {
    weight += /[一-鿿㐀-䶿豈-﫿]/.test(ch) ? 2 : 1;
  }
  if (weight > 12) return 'Name is too long (max 6 Chinese characters or 12 English letters)';
  return null;
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512 KiB

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
  const [tab, setTab] = useState<'profile' | 'password'>(initialTab);

  const [name, setName] = useState(user.name || '');
  const [initials, setInitials] = useState(user.initials || '');
  const [avatarBg, setAvatarBg] = useState(user.avatarBg || '#0D9488');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user.avatarDataUrl ?? null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = () => {
    setProfileError('');
    const err = validateName(name);
    if (err) {
      setProfileError(err);
      return;
    }
    const n = name.trim();
    const init =
      initials.trim().slice(0, 2).toUpperCase() ||
      n
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    updateProfile({ name: n, initials: init, avatarBg, avatarDataUrl });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
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

    // Reset input so re-selecting the same file works
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarDataUrl(null);
  };

  const handleSavePassword = () => {
    setPwError('');
    if (!currentPw) {
      setPwError('Enter your current password');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match');
      return;
    }
    const r = changePassword(currentPw, newPw);
    if (!r.ok) {
      setPwError(r.error!);
      return;
    }
    setPwSaved(true);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwSaved(false), 2200);
  };

  const inputClass =
    'w-full h-10 px-3.5 rounded-lg text-sm outline-none border transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-text-tertiary';
  const inputStyle = {
    background: '#F3F6F7',
    borderColor: 'rgba(0,53,39,0.08)',
    color: '#131b2e',
  };

  const displayInitials =
    initials ||
    user.name
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[65] bg-black/25 animate-[fadeIn_150ms]"
        onClick={onClose}
      />

      {/* Centered dialog */}
      <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[440px] rounded-2xl shadow-2xl animate-[scaleIn_200ms_ease-out]"
          style={{ background: '#FFFFFF' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'rgba(0,53,39,0.08)' }}
          >
            <h3 className="text-base font-bold" style={{ color: '#131b2e' }}>
              Account Settings
            </h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 px-4 py-3 border-b"
            style={{ borderColor: 'rgba(0,53,39,0.08)' }}
          >
            {(
              [
                { key: 'profile' as const, label: 'Edit Profile', icon: User },
                { key: 'password' as const, label: 'Change Password', icon: Lock },
              ]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                  tab === t.key
                    ? 'text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary',
                )}
                style={tab === t.key ? { background: '#003527' } : undefined}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 max-h-[55vh] overflow-y-auto">
            {tab === 'profile' && (
              <>
                {/* Avatar preview section — clickable for upload */}
                <div
                  className="flex flex-col items-center gap-3 pb-4 border-b"
                  style={{ borderColor: 'rgba(0,53,39,0.06)' }}
                >
                  <div className="relative group cursor-pointer">
                    {avatarDataUrl ? (
                      /* Uploaded image avatar */
                      <img
                        src={avatarDataUrl}
                        alt="Avatar"
                        className="h-20 w-20 rounded-full object-cover ring-4 ring-surface-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    ) : (
                      /* Initials + color avatar */
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full text-white text-2xl font-bold ring-4 ring-surface-secondary transition-all"
                        style={{ background: avatarBg }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {displayInitials}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Upload / Remove buttons */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {avatarDataUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {avatarDataUrl && (
                      <button
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
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    Display Name
                  </label>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setProfileError('');
                    }}
                    placeholder="Your name"
                    maxLength={24}
                  />
                  <p className="text-[10px] text-text-tertiary">
                    6 Chinese characters or 12 English letters max
                  </p>
                </div>

                {/* Initials */}
                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    Avatar Initials
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      className={inputClass}
                      style={inputStyle}
                      value={initials}
                      onChange={(e) => setInitials(e.target.value.slice(0, 2).toUpperCase())}
                      maxLength={2}
                      placeholder="AU"
                    />
                    {/* Live initials preview */}
                    {avatarDataUrl ? (
                      <img
                        src={avatarDataUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                        style={{ background: avatarBg }}
                      >
                        {initials || '?'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-2">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    Avatar Color
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setAvatarBg(c.value)}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer',
                          'hover:scale-110 hover:shadow-md active:scale-95',
                          avatarBg === c.value && 'ring-2 ring-offset-2 ring-emerald-500',
                        )}
                        style={{ background: c.value }}
                        title={c.label}
                      >
                        {avatarBg === c.value && (
                          <Check className="h-5 w-5 text-white drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
                    {profileError}
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  className={cn(
                    'w-full h-10 rounded-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]',
                    profileSaved ? 'bg-emerald-600' : 'hover:bg-emerald-800',
                  )}
                  style={{ background: profileSaved ? '#059669' : '#003527' }}
                >
                  {profileSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Profile Updated
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            )}

            {tab === 'password' && (
              <>
                <div
                  className="flex items-center gap-3 p-4 rounded-xl mb-2"
                  style={{ background: 'rgba(0,53,39,0.03)' }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <Lock className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Update Password</p>
                    <p className="text-xs text-text-tertiary">
                      Choose a strong password you don&apos;t use elsewhere
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    Current Password
                  </label>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    type="password"
                    value={currentPw}
                    onChange={(e) => {
                      setCurrentPw(e.target.value);
                      setPwError('');
                    }}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      className={inputClass + ' pr-10'}
                      style={inputStyle}
                      type={showPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => {
                        setNewPw(e.target.value);
                        setPwError('');
                      }}
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#003527' }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    type="password"
                    value={confirmPw}
                    onChange={(e) => {
                      setConfirmPw(e.target.value);
                      setPwError('');
                    }}
                    placeholder="Re-enter new password"
                  />
                </div>

                {pwError && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                    <X className="h-4 w-4 shrink-0" />
                    {pwError}
                  </div>
                )}

                <button
                  onClick={handleSavePassword}
                  className={cn(
                    'w-full h-10 rounded-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]',
                    pwSaved ? 'bg-emerald-600' : 'hover:bg-emerald-800',
                  )}
                  style={{ background: pwSaved ? '#059669' : '#003527' }}
                >
                  {pwSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Password Updated
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
