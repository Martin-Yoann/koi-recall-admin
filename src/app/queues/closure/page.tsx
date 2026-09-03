'use client';

import { QueueWorkspace } from '@/components/admin/queue-workspace';

export default function ClosureQueuePage() {
  return (
    <QueueWorkspace
      queue="closure"
      title="Closure Queue"
      description="Cases in closure review — verify resolution and reportability, then close."
      emptyHint="No cases are in closure review right now."
    />
  );
}
