import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AdminProviders } from '@/components/admin/admin-providers';
import { AntdThemeProvider } from '@/components/admin/antd-theme-provider';
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AntdRegistry>
          <AntdThemeProvider>
            <AdminProviders>{children}</AdminProviders>
          </AntdThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
