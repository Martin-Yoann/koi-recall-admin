'use client';

import { useState } from 'react';
import { Checkbox, Input } from 'antd';
import { ChevronDown, Search, X } from 'lucide-react';

const GROUPS = [
  {
    id: 'cases',
    name: 'Cases & queues',
    description: 'Read, assign and work recall cases.',
    keys: ['case.queue.read', 'case.detail.read', 'case.assign', 'case.status.transition'],
  },
  {
    id: 'data',
    name: 'Customer data & exports',
    description: 'Access sensitive customer information and export files.',
    keys: ['case.detail.read_pii_raw', 'case.export'],
  },
  {
    id: 'campaigns',
    name: 'Recall campaigns',
    description: 'Publish recall notices and campaign updates.',
    keys: ['campaign.publish'],
  },
  {
    id: 'reviews',
    name: 'Safety & compliance',
    description: 'Complete reportability reviews and disposal decisions.',
    keys: ['review.close', 'disposal.review', 'disposal.hold.manage', 'disposal.instructions.publish'],
  },
  {
    id: 'staff',
    name: 'Users & security',
    description: 'View staff, manage accounts and review audit history.',
    keys: ['staff.read', 'staff.manage', 'audit.read'],
  },
];

interface Props {
  selected: string[];
  names: Record<string, string>;
  disabled: boolean;
  canRename: boolean;
  onSelection: (selected: string[]) => void;
  onRename: (key: string, name: string) => void;
  errors: Record<string, string>;
}

export function PermissionTree({
  selected,
  names,
  disabled,
  canRename,
  onSelection,
  onRename,
  errors,
}: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [rename, setRename] = useState(false);
  const keys = Object.keys(names);
  const selectedSet = new Set(selected);
  const selectedCount = keys.filter((key) => selectedSet.has(key)).length;
  const search = query.trim().toLowerCase();
  const editingLabels = rename || keys.some((key) => errors[`permission-name-${key}`]);
  const groups = [
    ...GROUPS,
    {
      id: 'other',
      name: 'Other permissions',
      description: '',
      keys: keys.filter((key) => !GROUPS.some((group) => group.keys.includes(key))),
    },
  ]
    .map((group) => ({
      ...group,
      keys: group.keys.filter((key) => Object.hasOwn(names, key)),
      visible: group.keys.filter(
        (key) =>
          Object.hasOwn(names, key) &&
          (!search || `${group.name} ${names[key]} ${key}`.toLowerCase().includes(search)),
      ),
    }))
    .filter((group) => group.visible.length > 0);

  const toggle = (targets: string[], enabled: boolean) => {
    const next = new Set(selected);
    targets.forEach((key) => {
      if (enabled) next.add(key);
      else next.delete(key);
    });
    onSelection(keys.filter((key) => next.has(key)));
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-surface-elevated">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <Input
          aria-label="Search permissions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search permissions"
          prefix={<Search className="h-4 w-4 text-text-tertiary" />}
          allowClear
          className="!min-w-48 !flex-1"
        />
        {canRename && (
          <button
            type="button"
            onClick={() => setRename(!rename)}
            className="text-xs font-medium text-brand-500 underline-offset-4 hover:underline"
          >
            {rename ? 'Done editing labels' : 'Edit permission labels'}
          </button>
        )}
      </div>
      {editingLabels && (
        <p className="border-b bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
          Permission labels are shared across all roles. Changes are applied when you save this role.
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-b bg-surface-secondary px-4 py-3">
        <Checkbox
          aria-label="Select all permissions"
          checked={selectedCount === keys.length && keys.length > 0}
          indeterminate={selectedCount > 0 && selectedCount < keys.length}
          disabled={disabled}
          onChange={(event) => toggle(keys, event.target.checked)}
        >
          Select all permissions
        </Checkbox>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-brand-500 hover:underline"
          onClick={() =>
            setExpanded(
              expanded.length === GROUPS.length + 1 ? [] : [...GROUPS.map((group) => group.id), 'other'],
            )
          }
        >
          {expanded.length === GROUPS.length + 1 ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {groups.map((group) => {
        const count = group.keys.filter((key) => selectedSet.has(key)).length;
        const open =
          Boolean(search) ||
          expanded.includes(group.id) ||
          group.keys.some((key) => errors[`permission-name-${key}`]);
        return (
          <section key={group.id} className="border-b last:border-b-0">
            <div className="flex items-center gap-3 bg-surface-secondary/50 px-4 py-3">
              <Checkbox
                aria-label={`Select all ${group.name} permissions`}
                disabled={disabled}
                checked={count === group.keys.length}
                indeterminate={count > 0 && count < group.keys.length}
                onChange={(event) => toggle(group.keys, event.target.checked)}
              />
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`permission-group-${group.id}`}
                onClick={() =>
                  setExpanded((previous) =>
                    previous.includes(group.id)
                      ? previous.filter((id) => id !== group.id)
                      : [...previous, group.id],
                  )
                }
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
              >
                <span className="text-sm font-medium text-text-primary">{group.name}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
                  <span aria-label={`${count} of ${group.keys.length} selected`}>
                    {count}/{group.keys.length}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </div>
            {open && (
              <div id={`permission-group-${group.id}`} className="space-y-3 border-t px-5 py-4 sm:pl-11">
                <p className="text-xs text-text-tertiary">{group.description}</p>
                {group.visible.map((key) => {
                  const fieldId = `permission-name-${key}`;
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <Checkbox
                        aria-label={names[key] || key}
                        disabled={disabled}
                        checked={selectedSet.has(key)}
                        onChange={(event) => toggle([key], event.target.checked)}
                        className="!mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        {editingLabels && canRename ? (
                          <Input
                            id={fieldId}
                            aria-label={`Name for ${key}`}
                            aria-invalid={Boolean(errors[fieldId])}
                            status={errors[fieldId] ? 'error' : undefined}
                            disabled={disabled}
                            maxLength={100}
                            value={names[key]}
                            onChange={(event) => onRename(key, event.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-text-primary">{names[key]}</span>
                        )}
                        {errors[fieldId] && <p className="mt-1 text-xs text-red-600">{errors[fieldId]}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {!groups.length && (
        <div className="p-8 text-center text-sm text-text-secondary">
          <p>No matching permissions.</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-brand-500"
            onClick={() => setQuery('')}
          >
            <X className="h-3 w-3" />
            Clear search
          </button>
        </div>
      )}
      <div className="border-t px-4 py-3 text-xs text-text-secondary">
        {selectedCount} of {keys.length} permissions selected
      </div>
    </div>
  );
}
