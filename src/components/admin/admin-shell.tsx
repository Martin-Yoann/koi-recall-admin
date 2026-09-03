'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard, FolderOpen, ListOrdered, AlertTriangle,
  Download, Shield, Menu, X, Pin, PinOff, LogOut, LogIn,
  User, Key, Bell, CircleHelp, ArrowRight, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';
import { listCases, type CaseSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatAdminDateTime } from '@/lib/formatters';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SIDENAV = [
  { label: 'Operations Overview', href: '/',          icon: LayoutDashboard },
  { label: 'Cases',               href: '/cases',     icon: FolderOpen },
  {
    label: 'Queues',
    href: '/queues',
    icon: ListOrdered,
    children: [
      { label: 'All Queues', href: '/queues' },
      { label: 'Decision Queue', href: '/queues/decision' },
      { label: 'Closure Queue', href: '/queues/closure' },
    ],
  },
  { label: 'Incidents & Safety',  href: '/incidents', icon: AlertTriangle },
  { label: 'Exports & Jobs',      href: '/exports',   icon: Download },
  {
    label: 'Access & Audit',
    href: '/access',
    icon: Shield,
    children: [
      { label: 'Permission Overview', href: '/access/permissions' },
      { label: 'User Management', href: '/access/staff' },
      { label: 'Operation Logs', href: '/access/audit' },
    ],
  },
];

/** Review-process steps shown in the "?" help menu. */
const PROCESS_STEPS = [
  { label: 'Intake',           detail: 'New consumer submissions land here (triage).', href: '/cases?status=submitted' },
  { label: 'Review',           detail: 'Check product, evidence and PII, then assign.', href: '/cases?status=under_review' },
  { label: 'Request info',     detail: 'ask the consumer for anything missing (need_info).', href: '/cases?status=need_info' },
  { label: 'Decision',         detail: 'Approve refund/replacement or reject / duplicate.', href: '/cases?status=approved' },
  { label: 'Close',            detail: 'Verify resolution done + reportability, then close.', href: '/cases?status=closure_review' },
];

/**
 * Bell — surfaces how many submissions are waiting for first intake; clicking
 * opens the notification drawer (see NotificationDrawer).
 */
function NewSubmissionsBell({ onOpen }: { onOpen: () => void }) {
  const { isAuthenticated } = useAdminAuth();
  const [count, setCount] = useState<number>(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const result = await listCases({ status: 'submitted', limit: 100 });
    if (result.ok) setCount(result.data.cases.length);
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${count} new submissions`}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors"
    >
      <Bell className="h-[18px] w-[18px] text-text-secondary" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-strawberry px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

/** Right-side notification drawer listing the latest C-end submissions. */
function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAuthenticated } = useAdminAuth();
  const [items, setItems] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const result = await listCases({ status: 'submitted', limit: 40 });
    if (result.ok) setItems(result.data.cases);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close new submissions drawer"
        className="fixed inset-0 z-[60] cursor-default bg-black/30 animate-[fadeIn_200ms] motion-reduce:animate-none"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[60] w-full max-w-[440px] overflow-y-auto overscroll-contain shadow-2xl animate-[slideInRight_300ms_cubic-bezier(0.25,0,0.15,1)] motion-reduce:animate-none flex flex-col"
        style={{ background: '#FFFFFF' }}
        aria-label="New submissions"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-strawberry/10">
            <Bell className="h-4.5 w-4.5 text-strawberry" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">New Submissions</p>
            <p className="text-xs text-text-tertiary truncate">
              {items.length} awaiting intake · refreshes automatically
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors" aria-label="Close">
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          {loading && items.length === 0 ? (
            <p className="p-8 text-sm text-text-tertiary text-center">Loading…</p>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
              <p className="text-sm font-semibold text-text-primary">No new submissions</p>
              <p className="text-xs text-text-tertiary mt-1">Newly submitted cases will appear here.</p>
            </div>
          ) : (
            items.map((c) => (
              <Link
                key={c.caseReference}
                href={`/cases/${c.caseReference}`}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-surface-secondary transition-colors"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-strawberry" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold font-mono text-text-primary truncate">{c.caseReference}</p>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">
                    {c.subtype.replace(/_/g, ' ')} · {formatAdminDateTime(c.submittedAt)}
                  </p>
                </div>
                <StatusBadge variant={c.status as never} />
                <ArrowRight className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
              </Link>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

/** Help "?" — the review-process guide in a dropdown. */
function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Open review workflow help" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40">
        <CircleHelp className="h-[18px] w-[18px] text-text-secondary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 mt-2">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(240,91,120,0.10)' }}>
          <p className="text-sm font-semibold text-text-primary">Review Workflow</p>
          <p className="text-xs text-text-tertiary mt-0.5">How a submitted claim is processed</p>
        </div>
        <div className="p-1.5">
          {PROCESS_STEPS.map((step, idx) => (
            <DropdownMenuItem key={step.label} render={<Link href={step.href} />} className="cursor-pointer rounded-lg py-2.5 px-3">
              <span className="flex items-start gap-3 w-full">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-strawberry/10 text-[11px] font-bold text-strawberry">
                  {idx + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-primary">{step.label}</span>
                  <span className="block text-xs text-text-tertiary">{step.detail}</span>
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sidebar dimensions, timing & transitions
// ═══════════════════════════════════════════════════════════════
const COLLAPSED_W = 'w-[64px]';
const EXPANDED_W  = 'w-[236px]';
const HOVER_DELAY = 180;   // ms before expanding
const HOVER_LEAVE = 350;   // ms before collapsing (extra margin avoids jitter)
const TRANSITION_SIDEBAR = 'transition-[width] duration-[320ms] ease-[cubic-bezier(0.25,0,0.15,1)]';

/* ── Smooth, natural admin-panel feel: slow start, gentle decel ── */
const TRANSITION_CHILD = 'transition-[opacity,transform,background-color,color,padding,gap] duration-[280ms] ease-[cubic-bezier(0.25,0,0.15,1)]';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openLogin, openProfile } = useAdminAuth();
  // Keep the sidebar expanded by default, matching the reference layout.
  // Users can still unpin it from the footer to restore hover-collapse behavior.
  const [locked, setLocked] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const accessPathActive = pathname === '/access' || pathname.startsWith('/access/');
  const queuesPathActive = pathname === '/queues' || pathname.startsWith('/queues/');
  // The one nav group currently expanded (Queues or Access & Audit). Defaults
  // to whichever group contains the active route; toggling a group while
  // another is open collapses the previous one.
  const [openGroup, setOpenGroup] = useState<string | null>(
    queuesPathActive ? '/queues' : accessPathActive ? '/access' : null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMobileOpen(false);
      setOpenGroup(queuesPathActive ? '/queues' : accessPathActive ? '/access' : null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accessPathActive, queuesPathActive, pathname]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);

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
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 cursor-default bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
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
        style={{
          background: 'linear-gradient(180deg, #0D1B2A 0%, #102A43 52%, #0B1726 100%)',
          borderColor: 'rgba(143,180,255,0.16)',
          boxShadow: '8px 0 28px rgba(4, 12, 24, 0.16)',
        }}
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          className={cn(
            'flex items-center h-[64px] shrink-0 border-b cursor-pointer',
            TRANSITION_CHILD,
            expanded ? 'px-5 gap-3' : 'justify-center',
          )}
          style={{ borderColor: 'rgba(143,180,255,0.14)' }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/95 shadow-[0_4px_16px_rgba(58,134,255,0.28)]">
            <Image
              src="/KOI.png"
              alt="KOI"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          {expanded && (
            <div className="leading-tight min-w-0 animate-[fadeIn_160ms_ease-out]">
              <p className="text-[15px] font-bold tracking-tight text-white truncate">KOI Admin</p>
              <p className="text-[10px] text-white/35 font-medium uppercase tracking-widest">Recall Platform</p>
            </div>
          )}
        </Link>

        {/* ── Nav items ── */}
        <nav
          aria-label="Primary navigation"
          className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          TRANSITION_CHILD,
          expanded ? 'py-5 px-3' : 'py-4 px-[6px]',
        )}>
          {SIDENAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            const hasChildren = Boolean(item.children);
            const groupOpen = openGroup === item.href;
            const groupId = `${item.href.slice(1).replaceAll('/', '-') || 'root'}-submenu`;

            return (
              <div key={item.href} className="my-[2px]">
                <div className="flex items-center gap-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setOpenGroup((current) => (current === item.href ? null : item.href))}
                      aria-expanded={groupOpen}
                      aria-controls={groupId}
                      className={cn(
                        'flex min-w-0 flex-1 items-center rounded-lg cursor-pointer select-none text-left',
                        TRANSITION_CHILD,
                        expanded ? 'gap-3 px-[10px] py-[9px] justify-start' : 'gap-0 py-[9px] justify-center',
                        active
                          ? 'text-[#FFFFFF] bg-[var(--brand-emerald)]'
                          : 'text-[#94A3B8] bg-transparent hover:text-[#FFFFFF] hover:bg-[var(--menu-hover)] active:scale-[0.985]',
                      )}
                      data-nav-state={active ? 'active' : 'idle'}
                      style={active ? { color: '#FFFFFF', backgroundColor: 'var(--brand-emerald)' } : undefined}
                      title={!expanded ? item.label : undefined}
                    >
                      <Icon className="w-[20px] h-[20px] shrink-0" />
                      {expanded && <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>}
                      {expanded && (
                        <ChevronDown
                          className={cn('ml-auto h-4 w-4 shrink-0 text-white transition-transform duration-200', groupOpen && 'rotate-180')}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => { setMobileOpen(false); setOpenGroup(null); }}
                      className={cn(
                        'flex min-w-0 flex-1 items-center rounded-lg cursor-pointer select-none',
                        TRANSITION_CHILD,
                        expanded ? 'gap-3 px-[10px] py-[9px] justify-start' : 'gap-0 py-[9px] justify-center',
                        active
                          ? 'text-[#FFFFFF] bg-[var(--brand-emerald)]'
                          : 'text-[#94A3B8] bg-transparent hover:text-[#FFFFFF] hover:bg-[var(--menu-hover)] active:scale-[0.985]',
                      )}
                      data-nav-state={active ? 'active' : 'idle'}
                      style={active ? { color: '#FFFFFF', backgroundColor: 'var(--brand-emerald)' } : undefined}
                      title={!expanded ? item.label : undefined}
                    >
                      <Icon className="w-[20px] h-[20px] shrink-0" />
                      {expanded && <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>}
                      {expanded && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] shrink-0" />}
                    </Link>
                  )}
                </div>

                {expanded && hasChildren && groupOpen && (
                  <div id={groupId} className="ml-8 mt-1 space-y-1 border-l border-white/10 pl-2">
                    {item.children?.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-200 cursor-pointer',
                            childActive
                              ? 'bg-[var(--menu-hover)] text-[#FFFFFF]'
                              : 'text-[#94A3B8] hover:bg-[var(--menu-hover)] hover:text-[#FFFFFF]',
                          )}
                          data-nav-state={childActive ? 'subactive' : 'idle'}
                          style={childActive ? { color: '#FFFFFF', backgroundColor: 'var(--menu-hover)' } : undefined}
                        >
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
                  <Image src={user.avatarDataUrl as string} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" unoptimized />
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
                type="button"
                onClick={(e) => { e.stopPropagation(); setLocked((v) => !v); }}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200 cursor-pointer',
                  'hover:bg-white/10 active:scale-90',
                  locked ? ' text-blue-400 bg-white/8' : 'text-white/35',
                )}
                title={locked
                  ? 'Unpin — sidebar will auto-collapse when you move the mouse away'
                  : 'Pin — keep sidebar permanently expanded'}
                aria-label={locked ? 'Unpin sidebar' : 'Pin sidebar'}
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
        <header className="sticky top-0 z-50 h-16 border-b bg-surface-elevated/95 backdrop-blur flex items-center justify-between px-4 lg:px-6 shrink-0">
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
            <HelpMenu />
            <NewSubmissionsBell onOpen={() => setNotifOpen(true)} />
            <div className="h-5 w-px bg-border" />
            <span className="text-xs font-medium text-text-tertiary select-none hidden lg:inline">KOI Recall Admin</span>
            <div className="hidden lg:block h-5 w-px bg-border" />
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Open account menu" className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full hover:bg-surface-secondary cursor-pointer transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40 select-none group">
                  <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate max-w-[120px] hidden sm:inline">
                    {user.name}
                  </span>
                  {'avatarDataUrl' in user && user.avatarDataUrl ? (
                    <Image src={user.avatarDataUrl as string} alt="" width={32} height={32} className="flex h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-transparent group-hover:ring-brand-emerald/20 transition-[box-shadow]" unoptimized />
                  ) : (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-brand-emerald/20 transition-[box-shadow]"
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
                        <Image src={user.avatarDataUrl as string} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" unoptimized />
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
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--brand-emerald)] hover:bg-[var(--menu-hover)] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-3 lg:p-5 xl:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* New-submissions notification drawer */}
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
