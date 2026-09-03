import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'INYATHI Fleet Management Portal',
  description: 'INYATHI Fleet Management - Reconciliations, Fleet, and Booking System',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'INYATHI' },
  applicationName: 'INYATHI',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="INYATHI" />
      </head>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased min-h-screen selection:bg-teal-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
