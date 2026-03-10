import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Solar Flow',
  description: 'Solar Flow application scaffold',
  icons: {
    icon: [
      { url: '/assets/solarflow-favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/solarflow-app-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/assets/solarflow-favicon.svg',
    apple: '/assets/solarflow-app-icon.svg',
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
