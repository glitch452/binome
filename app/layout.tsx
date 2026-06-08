import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SerwistProvider } from '@serwist/next/react';

import { AccentProvider } from '@/contexts/AccentContext';
import { ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';
import { TimerNumeralFontProvider } from '@/contexts/TimerNumeralFontContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Binome',
  description: 'A countdown timer application. Every second counts.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Binome', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#4f46e5' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geistSans.variable, geistMono.variable)}>
      <body>
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV === 'development'}
          // eslint-disable-next-line react/jsx-boolean-value -- SerwistProvider's reloadOnOnline default is true; the explicit false (no auto-reload on reconnect, protecting an in-memory running timer) must NOT be omitted
          reloadOnOnline={false}
          cacheOnNavigation
        >
          <ThemeProvider>
            <AccentProvider>
              <TimerFontSizeProvider>
                <TimerNumeralFontProvider>
                  <TimerStoreProvider>
                    <ActiveTimerProvider>{children}</ActiveTimerProvider>
                  </TimerStoreProvider>
                  <Toaster />
                </TimerNumeralFontProvider>
              </TimerFontSizeProvider>
            </AccentProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
