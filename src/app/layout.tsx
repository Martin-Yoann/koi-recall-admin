import type { Metadata } from 'next';
import { AdminProviders } from '@/components/admin/admin-providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'KOI Admin', template: '%s | KOI Admin' },
  description: 'Monitor recall campaigns, manage cases, and monitor operations.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="h-screen flex bg-surface-secondary overflow-hidden">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
