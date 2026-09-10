import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Script from 'next/script';
import { AdminProviders } from '@/components/admin/admin-providers';
import { AntdThemeProvider } from '@/components/admin/antd-theme-provider';
import { ThemeProvider } from '@/components/admin/theme-provider';
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
          <ThemeProvider>
            <AntdThemeProvider>
              <AdminProviders>{children}</AdminProviders>
            </AntdThemeProvider>
          </ThemeProvider>
        </AntdRegistry>
        {/* Apply the persisted theme before hydration to avoid a flash of the
            wrong theme. `system` resolves against the OS preference here too.
            next/script injects this into <head>. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function() {
            try {
              var saved = localStorage.getItem('koi_admin_mode') || 'light';
              var dark = saved === 'dark' ||
                (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) document.documentElement.classList.add('dark');
              var lang = localStorage.getItem('koi_admin_locale');
              if (lang === 'en-US' || lang === 'zh-CN') document.documentElement.lang = lang;
              if (localStorage.getItem('koi_admin_reduce_motion') === 'true') {
                document.documentElement.setAttribute('data-reduce-motion', 'true');
              }
            } catch (e) {}
          })()`}
        </Script>
      </body>
    </html>
  );
}
