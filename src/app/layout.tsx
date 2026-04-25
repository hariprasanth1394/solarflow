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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='solarflow-theme';var saved=localStorage.getItem(key);var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=saved?saved==='dark':prefersDark;var root=document.documentElement;if(isDark){root.classList.add('theme-dark');root.classList.add('dark');}else{root.classList.remove('theme-dark');root.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
