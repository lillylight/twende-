import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import AccessibilityPanel from '@/components/accessibility-panel';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Twende - Safe Bus Travel in Zambia',
  description:
    'Real-time bus tracking, online booking, USSD support, and RTSA compliance monitoring for safer public transport across Zambia.',
  keywords: [
    'Zambia',
    'bus tracking',
    'bus booking',
    'RTSA',
    'public transport',
    'safety',
    'USSD',
    'mobile money',
  ],
  openGraph: {
    title: 'Twende - Safe Bus Travel in Zambia',
    description:
      'Real-time bus tracking, online booking, and safety monitoring for Zambian public transport.',
    type: 'website',
    locale: 'en_ZM',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <body className={`min-h-dvh bg-light text-dark antialiased ${inter.className}`}>
        <a
          href="#main-content"
          className="fixed left-2 top-2 z-[100] -translate-y-16 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <main id="main-content">{children}</main>
        </ToastProvider>
        <AccessibilityPanel />
      </body>
    </html>
  );
}
