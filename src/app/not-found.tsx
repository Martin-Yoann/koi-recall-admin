// ============================================================
// KOI Admin — 404 Not Found
// ============================================================

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-secondary">
            <Shield className="h-10 w-10 text-text-tertiary" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Page Not Found</h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            The page you are looking for does not exist or has been moved. Return to the dashboard to continue managing recall operations.
          </p>
        </div>
        <Link href="/">
          <Button variant="default" size="lg" className="bg-blade-resolution hover:bg-blade-resolution-dark">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
