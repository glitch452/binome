import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { cn } from '@/lib/utils';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Binome',
  description: 'A countdown timer application. Every second counts.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geistSans.variable, geistMono.variable)}>
      <body>
        <ThemeProvider>
          <TimerStoreProvider>
            <ActiveTimerProvider>{children}</ActiveTimerProvider>
          </TimerStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
