import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen">
      <aside className="h-full flex-shrink-0">
        <Sidebar />
      </aside>
      <div className="flex h-full flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center">
          <Header />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}