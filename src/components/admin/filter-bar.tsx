'use client';

// ============================================================
// KOI Admin — Filter Bar
// ============================================================

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;  // component converts null → 'all'
  }[];
  actions?: React.ReactNode;
}

export function FilterBar({ searchPlaceholder = 'Search...', searchValue, onSearchChange, filters, actions }: FilterBarProps) {
  const hasActiveFilters = searchValue || filters?.some((f) => f.value && f.value !== 'all');

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter selects */}
      {filters?.map((filter) => (
        <Select key={filter.label} value={filter.value} onValueChange={(v) => filter.onChange(v || 'all')}>
          <SelectTrigger className="h-10 w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange('');
            filters?.forEach((f) => f.onChange('all'));
          }}
          className="text-text-secondary h-10"
        >
          Clear Filters
        </Button>
      )}

      {/* Actions */}
      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  );
}
