import { cn } from '@/lib/utils';

type StatusVariant =
  | 'open' | 'reviewing' | 'verified' | 'resolved' | 'rejected'
  | 'active' | 'pending' | 'closed' | 'expanded'
  | 'draft' | 'submitted' | 'under_review' | 'remedy_issued';

const CONFIG: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
  open:           { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  reviewing:      { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  verified:       { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  resolved:       { dot: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected:       { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  active:         { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  pending:        { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  closed:         { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' },
  expanded:       { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  draft:          { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' },
  submitted:      { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  under_review:   { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  remedy_issued:  { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const LABELS: Record<StatusVariant, string> = {
  open: 'Open', reviewing: 'Reviewing', verified: 'Verified', resolved: 'Resolved',
  rejected: 'Rejected', active: 'Active', pending: 'Pending', closed: 'Closed',
  expanded: 'Expanded', draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  remedy_issued: 'Remedy Issued',
};

interface Props { variant: StatusVariant; label?: string; className?: string; }

export function StatusBadge({ variant, label, className }: Props) {
  const c = CONFIG[variant] ?? CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium', c.bg, c.text, className)}>
      <span className={cn('status-dot', c.dot)} />
      {label ?? LABELS[variant]}
    </span>
  );
}
