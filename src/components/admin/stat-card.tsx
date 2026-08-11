import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral'; label?: string };
  spark?: number[];
}

export function StatCard({ label, value, subtitle, icon: Icon, trend, spark }: StatCardProps) {
  const trendColor = trend?.direction === 'up' ? 'text-status-positive' :
    trend?.direction === 'down' ? 'text-status-danger' : 'text-text-tertiary';
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';

  return (
    <div className="card-lift rounded-xl border bg-surface-elevated p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
          <Icon className="h-4 w-4 text-emerald-700" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="metric-value text-2xl text-text-primary">{value}</p>
          {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
        </div>
        {trend && (
          <span className={cn('flex items-center gap-0.5 text-xs font-semibold', trendColor)}>
            {trendArrow} {trend.value}%
          </span>
        )}
      </div>

      {trend?.label && <p className="text-[10px] text-text-tertiary mt-1.5">{trend.label}</p>}
    </div>
  );
}
