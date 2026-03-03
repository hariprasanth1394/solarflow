"use client";

import { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-x-hidden overflow-y-hidden">
      
      {/* Desktop */}
      <div className="hidden md:block">
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden"
             onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform md:hidden`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-gray-100/60 backdrop-blur-sm overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}