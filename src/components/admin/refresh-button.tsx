'use client';

import { useState } from 'react';
import { Button } from 'antd';
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
    <Button
      onClick={handleClick}
      loading={loading}
      icon={<RotateCw className="h-4 w-4" />}
      className={cn(
        "border-slate-200 text-text-secondary hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50",
        className
      )}
    >
      Refresh
    </Button>
  );
}
