'use client';

import { QueueWorkspace } from '@/components/admin/queue-workspace';

export default function DecisionQueuePage() {
  return (
    <QueueWorkspace
      queue="decision"
      title="Decision Queue"
      description="Cases where an approval, rejection, or resolution decision is due."
      emptyHint="No cases are awaiting a decision right now."
    />
  );
}
