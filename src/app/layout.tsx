import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import AuthSessionSync from '../components/auth/AuthSessionSync';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
