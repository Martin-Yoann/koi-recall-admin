'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FolderOpen, ListOrdered, AlertTriangle,
  Download, Shield, Menu, X, Pin, PinOff, LogOut, LogIn,
  User, Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SIDENAV = [
  { label: 'Operations Overview', href: '/',              icon: LayoutDashboard },
  { label: 'Cases',               href: '/cases',         icon: FolderOpen },
  { label: 'Queues',              href: '/queues',        icon: ListOrdered },
  { label: 'Incidents & Safety',  href: '/incidents',     icon: AlertTriangle },
  { label: 'Exports & Jobs',      href: '/exports',       icon: Download },
  { label: 'Access & Audit',      href: '/access',        icon: Shield },
];

// ═══════════════════════════════════════════════════════════════
// Sidebar dimensions, timing & transitions
// ═══════════════════════════════════════════════════════════════
const COLLAPSED_W = 'w-[64px]';
const EXPANDED_W  = 'w-[236px]';
const HOVER_DELAY = 180;   // ms before expanding
const HOVER_LEAVE = 350;   // ms before collapsing (extra margin avoids jitter)
const TRANSITION_SIDEBAR = 'transition-[width] duration-[320ms] ease-[cubic-bezier(0.25,0,0.15,1)]';

/* ── Smooth, natural admin-panel feel: slow start, gentle decel ── */
const TRANSITION_CHILD = 'transition-all duration-[280ms] ease-[cubic-bezier(0.25,0,0.15,1)]';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openLogin, openProfile } = useAdminAuth();
  const [locked, setLocked] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "locked" wins over "hovering": when pinned, sidebar stays expanded
  const expanded = locked || hovering;

  const clearTimers = useCallback(() => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  }, []);

  const handleEnter = useCallback(() => {
    clearTimers();
    enterTimer.current = setTimeout(() => setHovering(true), HOVER_DELAY);
  }, [clearTimers]);

  const handleLeave = useCallback(() => {
    clearTimers();
    leaveTimer.current = setTimeout(() => setHovering(false), HOVER_LEAVE);
  }, [clearTimers]);

  // Unmount cleanup
  useEffect(() => () => { clearTimers(); }, [clearTimers]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ═════════════════════════════════════════════════════════
          SIDEBAR
          ═════════════════════════════════════════════════════════ */}
      <aside
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 flex flex-col border-r',
          'h-full', TRANSITION_SIDEBAR,
          expanded ? EXPANDED_W : COLLAPSED_W,
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ background: '#052745', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          className={cn(
            'flex items-center h-[64px] shrink-0 border-b cursor-pointer',
            TRANSITION_CHILD,
            expanded ? 'px-5 gap-3' : 'justify-center',
          )}
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {expanded && (
            <div className="leading-tight min-w-0 animate-[fadeIn_160ms_ease-out]">
              <p className="text-[15px] font-bold tracking-tight text-white truncate">KOI Admin</p>
              <p className="text-[10px] text-white/35 font-medium uppercase tracking-widest">Recall Platform</p>
            </div>
          )}
        </Link>

        {/* ── Nav items ── */}
        <nav className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          TRANSITION_CHILD,
          expanded ? 'py-4 px-[10px]' : 'py-4 px-[6px]',
        )}>
          {SIDENAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  /* Core layout */
                  'flex items-center rounded-lg cursor-pointer select-none',
                  'my-[2px]', // subtle vertical rhythm between items
                  TRANSITION_CHILD,
                  /* expanded vs collapsed */
                  expanded
                    ? 'gap-3 px-[10px] py-[9px] justify-start'
                    : 'gap-0 py-[9px] justify-center',
                  /* active state */
                  active
                    ? 'text-white bg-white/[0.10]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05] active:scale-[0.97]',
                )}
                title={!expanded ? item.label : undefined}
              >
                <Icon className="w-[20px] h-[20px] shrink-0" />
                {expanded && (
                  <span className="flex-1 truncate text-[13px] font-medium">
                    {item.label}
                  </span>
                )}
                {expanded && active && (
                  <span className="ml-auto h-[6px] w-[6px] rounded-full bg-white/50 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer + Lock ── */}
        <div
          className={cn(
            'border-t shrink-0', TRANSITION_CHILD,
            expanded ? 'opacity-100 px-4 py-3.5' : 'opacity-0 overflow-hidden px-0 py-3.5',
          )}
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 min-w-0">
                {'avatarDataUrl' in user && user.avatarDataUrl ? (
                  <img src={user.avatarDataUrl as string} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white text-xs font-bold">
                    {(user.initials || user.name.split(' ').map(n => n[0]).join('').slice(0, 2)).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-medium text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); openLogin(); }}
                className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}
            <div className="flex items-center gap-1">
              {isAuthenticated && (
                <button
                  onClick={(e) => { e.stopPropagation(); logout(); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/35 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setLocked((v) => !v); }}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200 cursor-pointer',
                  'hover:bg-white/10 active:scale-90',
                  locked ? 'text-emerald-400 bg-white/8' : 'text-white/35',
                )}
                title={locked
                  ? 'Unpin — sidebar will auto-collapse when you move the mouse away'
                  : 'Pin — keep sidebar permanently expanded'}
              >
                {locked ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ═════════════════════════════════════════════════════════
          MAIN CONTENT
          ═════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-surface-elevated/95 backdrop-blur flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-text-tertiary select-none">KOI Recall Admin</span>
            <div className="h-5 w-px bg-border" />
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full hover:bg-surface-secondary cursor-pointer transition-all duration-200 outline-none select-none group">
                  <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate max-w-[120px] hidden sm:inline">
                    {user.name}
                  </span>
                  {'avatarDataUrl' in user && user.avatarDataUrl ? (
                    <img src={user.avatarDataUrl as string} alt="" className="flex h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-transparent group-hover:ring-brand-emerald/20 transition-all" />
                  ) : (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-brand-emerald/20 transition-all"
                      style={{ background: user.avatarBg || '#0D9488' }}
                    >
                      {(user.initials || user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)).toUpperCase()}
                    </div>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 mt-2">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                    <div className="flex items-center gap-3">
                      {'avatarDataUrl' in user && user.avatarDataUrl ? (
                        <img src={user.avatarDataUrl as string} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                          style={{ background: user.avatarBg || '#0D9488' }}
                        >
                          {(user.initials || user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                        <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  {/* Menu items */}
                  <div className="p-1.5">
                    <DropdownMenuItem onClick={() => openProfile('profile')} className="cursor-pointer rounded-lg py-2.5 px-3 text-sm hover:bg-surface-secondary transition-colors">
                      <User className="mr-2.5 h-4.5 w-4.5 text-text-tertiary" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-text-primary">Edit Profile</span>
                        <span className="text-xs text-text-tertiary font-normal">Change name, avatar, color</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openProfile('password')} className="cursor-pointer rounded-lg py-2.5 px-3 text-sm hover:bg-surface-secondary transition-colors">
                      <Key className="mr-2.5 h-4.5 w-4.5 text-text-tertiary" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-text-primary">Change Password</span>
                        <span className="text-xs text-text-tertiary font-normal">Update your credentials</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                  <div className="p-1.5 pt-0 border-t" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                    <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg py-2.5 px-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="mr-2.5 h-4.5 w-4.5" />
                      Sign Out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 lg:p-5 xl:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
