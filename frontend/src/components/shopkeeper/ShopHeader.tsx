"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface ShopHeaderProps {
  shopName: string;
  village: string;
  unreadCount: number;
  onOpenNotifications: () => void;
  onResetDemo: () => Promise<void>;
  isResettingDemo?: boolean;
}

export default function ShopHeader({
  shopName,
  village,
  unreadCount,
  onOpenNotifications,
  onResetDemo,
  isResettingDemo = false,
}: ShopHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header
      className={`h-16 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#e5e1da] ${jakarta.className}`}
    >
      {/* Left: Clean Shop Information */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`${cormorant.className} text-xl sm:text-2xl font-semibold tracking-wide text-[#1c1e24] leading-tight`}
            >
              {shopName || "Kisan Krishi Kendra"}
            </h1>
            {village && (
              <span className="text-xs text-[#8c8e96] font-normal">
                · {village}
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium tracking-wider uppercase text-[#8c8e96] mt-0.5">
            Retail Partner Workspace
          </p>
        </div>
      </div>

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-4">
        {/* Quiet Reset Demo action */}
        <button
          type="button"
          onClick={onResetDemo}
          disabled={isResettingDemo}
          className="text-[11px] font-medium text-[#8c8e96] hover:text-[#1c1e24] px-2.5 py-1 rounded-md hover:bg-[#ede9e2]/60 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isResettingDemo ? "Resetting…" : "Reset Demo"}
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="relative p-1.5 rounded-lg text-[#5a5f6b] hover:text-[#1c1e24] hover:bg-[#ede9e2]/50 transition-colors cursor-pointer"
        >
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-[#c26d40] text-white text-[8.5px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#e5e1da]">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[#1c1e24] leading-tight">
              {user?.name || "Kisan Sharma"}
            </p>
            <p className="text-[10px] text-[#8c8e96]">
              Shopkeeper
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#8c8e96] hover:text-[#c26d40] hover:bg-[#ede9e2]/50 transition-colors cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
