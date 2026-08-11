// ============================================================
// KOI Admin — Empty State
// (shared with KOI-web)
// ============================================================

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary mb-5">
        <Icon className="h-8 w-8 text-text-tertiary" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <Button variant="default" size="sm" className="bg-blade-safety hover:bg-blade-safety-dark">
            {ctaLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
