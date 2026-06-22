"use client";

import AppLayout from "../../components/layout/AppLayout";
import { AuthProvider } from "../../contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}