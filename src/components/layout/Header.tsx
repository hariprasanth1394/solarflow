"use client";
import Button from "../../components/ui/Button";

import { Menu, Bell } from "lucide-react";

type HeaderProps = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <div className="h-16 bg-white shadow-sm flex items-center justify-between px-6">

      {/* Mobile Hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden"
      >
        <Menu size={22} />
      </button>

      {/* Search (Desktop Only) */}
      <div className="flex-1 px-4 hidden md:block">
        <input
          type="text"
          placeholder="Search..."
          className="w-full max-w-md border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">

        <div className="relative cursor-pointer">
          <Bell size={18} className="text-gray-600 hover:text-black transition" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
            3
          </span>
        </div>

        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
          <span className="hidden md:block text-sm font-medium">
            Admin
          </span>
        </div>

      </div>
    </div>
  );
}