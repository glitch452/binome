import type { ReactNode } from 'react';

export const metadata = {
  title: 'Binome',
  description: 'A countdown timer application. Every second counts.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
