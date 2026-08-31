'use client';

// KOI Recall Admin — Login
// Layout: KOI intro (left) + frosted-glass login card (right), deep-space
// gradient with animated aurora lights. Card has a rotating rainbow border
// and a diagonal shimmer sweep. Animations via framer-motion.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import {
  Shield, Eye, EyeOff, Loader2, ArrowRight, FileText, Download, ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

const INTRO = [
  { icon: FileText, title: 'Case review', text: 'Intake and resolve consumer recall claims' },
  { icon: Download, title: 'Refund exports', text: 'Generate finance-reconciliation CSVs in one click' },
  { icon: ShieldCheck, title: 'Audit trail', text: 'Compliance-grade logging of every action' },
];

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 110, damping: 20 } },
};

/** Animated aurora blob — slow drift + gentle scale. */
function Aurora({ className, dur, delay }: { className: string; dur: number; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      animate={{ x: [0, 70, 0], y: [0, -50, 0], scale: [1, 1.18, 1] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — send them to the dashboard (guard also handles this).
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/');
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    setSubmitting(true);
    setError('');
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error || 'Login failed');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-text-primary outline-none transition-all duration-200 ' +
    'placeholder:text-A8ABB2 focus:border-primary focus:ring-2 focus:ring-primary/25';

  return (
    <div
      className="flex-1 flex w-full min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#080B17 0%,#0E1530 40%,#1A103D 100%)' }}
    >
      {/* Animated aurora background */}
      <Aurora className="top-[-8rem] left-[-6rem] h-[28rem] w-[28rem] bg-primary/25" dur={16} delay={0} />
      <Aurora className="bottom-[-10rem] right-[-4rem] h-[30rem] w-[30rem] bg-purple-500/20" dur={20} delay={2} />
      <Aurora className="top-1/3 right-1/4 h-[20rem] w-[20rem] bg-sky/15" dur={24} delay={4} />
      {/* subtle tech grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(rgba(58,134,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(58,134,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative flex-1 grid lg:grid-cols-2 gap-8 items-center px-6 lg:px-16 py-10">
        {/* ── Left: KOI intro ── */}
        <motion.div variants={container} initial="hidden" animate="show" className="hidden lg:block max-w-xl">
          <motion.div variants={item} className="flex items-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">KOI Recall Admin</p>
              <p className="text-xs text-white/50">Product recall · Back-office platform</p>
            </div>
          </motion.div>

          <motion.h1 variants={item} className="text-4xl xl:text-[42px] font-bold tracking-tight text-white leading-tight">
            KOI Recall Operations Platform
          </motion.h1>

          <motion.p variants={item} className="mt-4 text-white/60 leading-relaxed text-[15px]">
            One place for your operations and compliance teams to run every recall: triage consumer
            claims, review evidence, request missing information, approve refunds and replacements,
            and export reconciliation files — end to end.
          </motion.p>

          <motion.div variants={item} className="mt-10 space-y-4">
            {INTRO.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.p variants={item} className="mt-12 text-xs text-white/30">
            © {new Date().getFullYear()} KOI · Internal use only
          </motion.p>
        </motion.div>

        {/* ── Right: login card (rainbow border + shimmer) ── */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[400px] rounded-2xl p-[1.5px] overflow-hidden shadow-2xl shadow-black/40"
          >
            {/* Rotating conic gradient — flowing border */}
            <div
              className="pointer-events-none absolute inset-[-150%] animate-[spin_9s_linear_infinite]"
              style={{ background: 'conic-gradient(from 0deg, #3A86FF, #7C4DFF, transparent 40%, #3A86FF)' }}
            />
            {/* Card body */}
            <div className="relative rounded-2xl bg-[#0E1630]/85 backdrop-blur-2xl p-8 overflow-hidden">
              {/* Diagonal shimmer sweep */}
              <div
                className="pointer-events-none absolute inset-y-0 w-1/2 animate-[shine_5.5s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%)' }}
              />

              {/* Mobile brand */}
              <div className="lg:hidden relative flex items-center justify-center gap-2.5 mb-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-base font-bold text-white">KOI Recall Admin</span>
              </div>

              <h2 className="relative text-2xl font-bold tracking-tight text-white">Welcome back</h2>
              <p className="relative text-sm text-white/60 mt-1.5 mb-6">Sign in with your staff account to continue.</p>

              {error && (
                <div className="relative mb-5 p-3 rounded-lg text-sm bg-red-500/20 border border-red-400/40 text-red-100" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="relative space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className={inputClass}
                    placeholder="admin@koi-platform.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-pw" className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-pw"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className={inputClass + ' pr-10'}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign-in button: on hover it turns white with dark text. */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] hover:bg-white hover:text-[#0D1B2A] hover:shadow-lg"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
                  ) : (
                    <>Sign In <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>

              <div className="relative mt-7 p-4 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/50 leading-relaxed">
                <p className="flex items-center gap-1.5 font-semibold text-white/80 mb-1">Access</p>
                <p>
                  Sign in with a staff account provisioned in the KOI back-office. Unauthenticated
                  requests are redirected here automatically.
                </p>
              </div>

              <p className="relative mt-6 text-[11px] text-white/40 text-center">© {new Date().getFullYear()} KOI Recall Admin</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
