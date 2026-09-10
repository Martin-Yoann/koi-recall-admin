'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared admin modal shell. Built on the Base UI dialog primitive so focus
 * trapping, Escape-to-close, scroll locking, and `aria-modal` wiring come from
 * the platform rather than hand-rolled markup (the previous per-dialog overlay
 * had none of them). The visual language matches the admin surface tokens.
 */
export function AdminDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  labelId,
  size = 'md',
  className,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Stable id for `aria-labelledby`; falls back to a generated-safe slug. */
  labelId: string;
  size?: 'md' | 'lg';
  className?: string;
  /** Pinned below the scrollable body (actions, hints). */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="admin-dialog-backdrop"
          className="fixed inset-0 z-[65] bg-black/25 duration-150 data-open:animate-[fadeIn_150ms] data-closed:animate-[fadeOut_120ms] motion-reduce:animate-none"
        />
        <DialogPrimitive.Popup
          data-slot="admin-dialog-popup"
          aria-modal="true"
          aria-labelledby={labelId}
          className={cn(
            'fixed inset-0 z-[65] m-auto flex items-center justify-center p-4 outline-none',
            'data-open:animate-[fadeIn_150ms] data-closed:animate-[fadeOut_120ms] motion-reduce:animate-none',
          )}
        >
          <div
            className={cn(
              'flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden overscroll-contain rounded-2xl shadow-2xl',
              'animate-[scaleIn_200ms_ease-out] motion-reduce:animate-none',
              'bg-[var(--surface-elevated)] backdrop-blur-md',
              size === 'lg' ? 'max-w-[760px]' : 'max-w-[440px]',
              className,
            )}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {Icon && <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />}
                <div className="min-w-0">
                  <h3 id={labelId} className="truncate text-base font-bold text-[var(--text-primary)]">
                    {title}
                  </h3>
                  {description && (
                    <p className="truncate text-xs text-text-tertiary">{description}</p>
                  )}
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label={`Close ${title}`}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-black/5"
              >
                <X className="h-4 w-4 text-text-tertiary" />
              </DialogPrimitive.Close>
            </div>

            {/* Body — the only scroll region, so long panels stay reachable */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer && (
              <div
                className="flex shrink-0 items-center justify-between gap-3 border-t px-6 py-3.5"
                style={{ borderColor: 'var(--border)' }}
              >
                {footer}
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
