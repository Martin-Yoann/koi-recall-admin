'use client';

// ============================================================
// Global toast — reusable success / error / info / warning alerts.
// Usage:
//   const toast = useToast();
//   toast.success('Staff user created');  toast.error('Failed to load');
//   toast.info('Export queued');
// Mount <ToastProvider> once near the app root; it renders the stack itself.
// ============================================================

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastApi {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastCtx = createContext<ToastApi | undefined>(undefined);

/**
 * success / info follow the admin theme primary (--brand-emerald mirrors the
 * user-selected theme color), while error stays red and warning stays amber —
 * semantic colors must remain recognizable regardless of theme.
 */
const TYPE_META: Record<ToastType, { icon: typeof Info; accent: string; iconBg: string; iconBgClass: string; iconColor: string; defaultTitle: string }> = {
  success: {
    icon: CheckCircle2,
    accent: 'toast-accent-primary',
    iconBgClass: 'toast-icon-primary',
    iconBg: 'var(--brand-emerald)',
    iconColor: 'text-white',
    defaultTitle: 'Success',
  },
  error: {
    icon: XCircle,
    accent: 'border-l-red-500',
    iconBgClass: 'bg-red-50',
    iconBg: 'var(--status-danger)',
    iconColor: 'text-red-600',
    defaultTitle: 'Error',
  },
  info: {
    icon: Info,
    accent: 'toast-accent-primary',
    iconBgClass: 'toast-icon-primary',
    iconBg: 'var(--brand-emerald)',
    iconColor: 'text-white',
    defaultTitle: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'border-l-amber-500',
    iconBgClass: 'bg-amber-50',
    iconBg: 'var(--status-warning)',
    iconColor: 'text-amber-600',
    defaultTitle: 'Warning',
  },
};

const AUTO_DISMISS_MS = 4200;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((type: ToastType, message: string, title?: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message, title }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastApi = {
    success: (m, t) => push('success', m, t),
    error: (m, t) => push('error', m, t),
    info: (m, t) => push('info', m, t),
    warning: (m, t) => push('warning', m, t),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={remove} />
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[min(92vw,380px)] pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const meta = TYPE_META[toast.type];
          const Icon = meta.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-white shadow-xl shadow-black/[0.06] p-3.5 border-l-4',
                meta.accent,
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm',
                  meta.iconBgClass,
                )}
                style={{ background: meta.iconBg }}
              >
                <Icon className={cn('h-5 w-5', meta.iconColor)} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-text-primary">{toast.title ?? meta.defaultTitle}</p>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
