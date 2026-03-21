import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZedPulse - Safe Bus Travel in Zambia',
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
    title: 'ZedPulse - Safe Bus Travel in Zambia',
    description:
      'Real-time bus tracking, online booking, and safety monitoring for Zambian public transport.',
    type: 'website',
    locale: 'en_ZM',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-dvh bg-light font-sans text-dark antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
