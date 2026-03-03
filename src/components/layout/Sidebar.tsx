"use client";
import { ChevronLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
type SidebarProps = {
  onNavigate?: () => void;
};
export default function Sidebar({ onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Tasks", path: "/tasks", icon: ClipboardList },
    { name: "Documents", path: "/documents", icon: FileText },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 25,
      }}
      className="
    h-screen
    bg-[#0f172a]
    text-white
    flex flex-col
    overflow-hidden
  "
    >
      {/* Top */}
      <div className="flex items-center justify-between p-4">

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">
            S
          </div>

          <span
            className={`
        font-semibold whitespace-nowrap
        transition-all duration-200
        ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}
      `}
          >
            SolarFlow
          </span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 transition"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <ChevronLeft size={18} />
          </motion.div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
    if (onNavigate) onNavigate();
  }}
              aria-current={isActive ? "page" : undefined}
              className={`
    relative flex items-center
    ${collapsed ? "justify-center" : "gap-3"}
    px-3 py-2 rounded-lg
    transition-all duration-200
    ${isActive
                  ? "text-white bg-white/10"
                  : "hover:bg-white/10"
                }
  `}
            >

              {/* Active Indicator */}
              {isActive && (
                <span
                  className="
      absolute left-0 top-1/2 -translate-y-1/2
      h-6 w-1
      bg-gradient-to-b from-[#6d28d9] to-[#7c3aed]
      rounded-r-full
    "
                />
              )}

              <Icon size={18} />

              <span
                className={`
      whitespace-nowrap
      transition-all duration-200
      ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}
    `}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto p-2 border-t border-white/10">
        <button
          type="button"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg
            transition-all duration-200 hover:bg-white/10
            ${collapsed ? "justify-center" : "justify-start"}
          `}
        >
          <LogOut size={18} />
          <motion.span
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
            }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap overflow-hidden"
          >
            Logout
          </motion.span>
        </button>
      </div>
    </motion.div>
  );
}