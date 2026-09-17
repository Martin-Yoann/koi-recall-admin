'use client';

import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Modal } from 'antd';
import { ExclamationCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

/**
 * App-wide confirmation dialog. Replaces the native `window.confirm` (which is
 * unstyled, blocks the main thread, and cannot follow the theme) with a themed
 * antd modal: fixed 800×385 on desktop, responsive on smaller viewports, and
 * fully token-driven so it flips with the light/dark theme.
 *
 * Usage: `const confirm = useConfirm(); if (!(await confirm({ title, details }))) return;`
 */

export interface ConfirmOptions {
  title: string;
  /** Body copy; a string or rich nodes. */
  description?: ReactNode;
  /** Small line under the title (e.g. the case reference). */
  subtitle?: string;
  okText?: string;
  cancelText?: string;
  /** Destructive actions get a warning icon and focus Cancel first. */
  destructive?: boolean;
  /**
   * Accent colour for the icon and the confirm button — pass the colour of the
   * action the user clicked so the dialog matches that button.
   */
  accent?: string;
  /** Status transition strip: what changes, from → to. */
  flow?: { from: ReactNode; to: ReactNode };
  /** Key/value context rows, rendered as a compact grid. */
  details?: Array<{ label: string; value: ReactNode }>;
  /** Callout under the details (what happens next, required reason, …). */
  note?: ReactNode;
  noteTone?: 'info' | 'warning';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/** Small pill used in the from → to strip. */
function StatusPill({ children, accent, tone }: { children: ReactNode; accent?: string; tone?: 'from' | 'to' }) {
  const color = tone === 'to' && accent ? accent : 'var(--text-secondary)';
  const background =
    tone === 'to' && accent
      ? `color-mix(in srgb, ${accent} 14%, transparent)`
      : 'var(--surface-secondary)';
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize"
      style={{ background, color }}
    >
      {children}
    </span>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const settle = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [],
  );

  const options = pending?.options;
  const accent = options?.accent ?? 'var(--brand-emerald)';
  const noteTone = options?.noteTone ?? 'info';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(pending)}
        centered
        width={800}
        closable={false}
        mask={{ closable: false }}
        footer={null}
        destroyOnHidden
        onCancel={() => settle(false)}
        styles={{
          container: {
            // 800 wide × 385 tall on desktop, shrinking with the viewport.
            height: 'min(385px, calc(100vh - 2rem))',
            overflow: 'hidden',
            borderRadius: 16,
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
          },
          body: {
            padding: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          },
          mask: { background: 'rgba(13, 27, 42, 0.45)' },
        }}
      >
        {options && (
          <>
            <div
              className="flex shrink-0 items-start gap-3 border-b px-7 pb-3.5 pt-5"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                  color: accent,
                }}
                aria-hidden="true"
              >
                {options.destructive ? <ExclamationCircleOutlined /> : <QuestionCircleOutlined />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {options.title}
                </h3>
                {options.subtitle && (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {options.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-7 py-4 text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {options.flow && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusPill tone="from">{options.flow.from}</StatusPill>
                  <span className="text-text-tertiary" aria-hidden="true">
                    →
                  </span>
                  <StatusPill tone="to" accent={accent}>
                    {options.flow.to}
                  </StatusPill>
                </div>
              )}

              {options.description && <div>{options.description}</div>}

              {options.details && options.details.length > 0 && (
                <dl
                  className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border p-3.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}
                >
                  {options.details.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        {row.label}
                      </dt>
                      <dd className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {options.note && (
                <div
                  className="flex items-start gap-2 rounded-lg p-3 text-xs leading-snug"
                  style={
                    {
                      background:
                        noteTone === 'warning'
                          ? 'color-mix(in srgb, var(--status-warning) 12%, transparent)'
                          : 'color-mix(in srgb, var(--brand-emerald) 10%, transparent)',
                      color: noteTone === 'warning' ? 'var(--status-warning)' : 'var(--text-secondary)',
                    } as CSSProperties
                  }
                >
                  {options.note}
                </div>
              )}
            </div>

            <div
              className="flex shrink-0 items-center justify-end gap-2 border-t px-7 py-3.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <Button onClick={() => settle(false)} autoFocus={Boolean(options.destructive)}>
                {options.cancelText ?? 'Cancel'}
              </Button>
              {/* Confirm button mirrors the accent of the action that opened it. */}
              <Button
                type="primary"
                className={options.accent ? 'confirm-accent-btn' : undefined}
                style={
                  options.accent
                    ? ({
                        // Inline so it beats antd's primary background; the CSS
                        // class supplies the hover shade from the same variable.
                        backgroundColor: options.accent,
                        borderColor: options.accent,
                        '--confirm-accent': options.accent,
                      } as CSSProperties)
                    : undefined
                }
                onClick={() => settle(true)}
                autoFocus={!options.destructive}
              >
                {options.okText ?? 'Confirm'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}
