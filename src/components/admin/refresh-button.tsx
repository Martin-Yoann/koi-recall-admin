'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onRefresh();
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors cursor-pointer",
        "border-slate-200 text-text-secondary hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50",
        "disabled:opacity-50",
        className
      )}
    >
      <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
      <span>Refresh</span>
    </button>
  );
}
