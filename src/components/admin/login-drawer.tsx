'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

export function LoginDrawer() {
  const { loginOpen, closeLogin, login } = useAdminAuth();
  const [email, setEmail] = useState('admin@koi-platform.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ESC to close
  useEffect(() => {
    if (!loginOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLogin(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loginOpen, closeLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email'); return; }
    if (!password) { setError('Enter your password'); return; }
    setSubmitting(true);
    setError('');
    const r = await login(email, password);
    if (!r.ok) {
      setError(r.error || 'Login failed');
      setSubmitting(false);
    }
  };

  if (!loginOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 animate-[fadeIn_200ms]"
        onClick={closeLogin}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-[420px] shadow-2xl animate-[slideInRight_300ms_cubic-bezier(0.25,0,0.15,1)]"
        style={{ background: '#052745' }}>
        <button
          onClick={closeLogin}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="flex flex-col justify-center h-full px-10 max-w-sm mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Shield className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">KOI Admin</span>
          </div>

          <h2 className="text-[22px] font-bold text-white mb-1">Sign In</h2>
          <p className="text-sm text-white/50 mb-8">Enter your credentials to access the admin panel</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5" htmlFor="la-email">
                Email
              </label>
              <input
                id="la-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm text-white outline-none border border-white/10 bg-white/5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-white/25"
                placeholder="admin@koi-platform.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5" htmlFor="la-pw">
                Password
              </label>
              <div className="relative">
                <input
                  id="la-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-lg text-sm text-white outline-none border border-white/10 bg-white/5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-white/25"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-xs text-white/25 text-center">
            Demo: admin@koi-platform.com / happyglobal123!
          </p>
        </div>
      </div>
    </>
  );
}
