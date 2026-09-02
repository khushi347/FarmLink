"use client";

import React, { useState, useEffect } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface HeaderProps {
  activeTab: string;
  onMenuClick: () => void;
}

const TAB_TITLES: Record<string, string> = {
  overview:   "Overview",
  orders:     "Orders",
  tripblocks: "TripBlocks",
  shops:      "Shops",
  delivery:   "Delivery",
  map:        "Live Geographic Map",
  settings:   "Settings",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Header({ activeTab, onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })
    );
  }, []);

  if (!user) return null;

  return (
    <header
      className={`h-14 flex items-center justify-between px-5 sm:px-7 sticky top-0 z-30 ${jakarta.className}`}
      style={{
        background: "rgba(250,248,245,0.93)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e5e1da",
      }}
    >
      {/* Left — mobile menu toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden p-1.5 rounded-md transition-colors"
          style={{ border: "1px solid #e5e1da", color: "#5a5f6b" }}
        >
          <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="2" y1="4.5" x2="16" y2="4.5" />
            <line x1="2" y1="9"   x2="16" y2="9" />
            <line x1="2" y1="13.5"x2="16" y2="13.5" />
          </svg>
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8c8e96" }}>
            <span>FarmLink</span>
            <span>/</span>
            <span style={{ color: "#1c1e24" }}>{TAB_TITLES[activeTab] ?? "Overview"}</span>
          </div>
        </div>
      </div>

      {/* Right — search, date, status, avatar */}
      <div className="flex items-center gap-3">

        {/* Search */}
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search requests, orders, shops…"
            className="warm-input h-8 pl-8 pr-3 rounded-lg text-xs w-56"
          />
          <svg
            className="absolute left-2.5 top-2 h-4 w-4 pointer-events-none"
            style={{ color: "#8c8e96" }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>

        {/* Date */}
        {dateStr && (
          <span
            className="hidden md:block text-[11px] font-semibold px-2.5 py-1 rounded-md"
            style={{ background: "#f4f1eb", color: "#5a5f6b", border: "1px solid #e5e1da" }}
          >
            {dateStr}
          </span>
        )}

        {/* Operational status */}
        <div
          className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
        >
          <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: "#3faa6e" }} />
          Operational
        </div>

        {/* Notification bell */}
        <button
          type="button"
          className="relative p-1.5 rounded-md transition-colors btn-ghost"
          aria-label="Notifications"
        >
          <svg className="h-4.5 w-4.5" style={{ color: "#5a5f6b" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-[#faf8f5]"
            style={{ background: "#c26d40" }}
          />
        </button>

        {/* User avatar */}
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
          style={{
            background: "#2c3e50",
            color: "#e8986a",
            border: "1px solid #243140",
          }}
        >
          {getInitials(user.name)}
        </div>
      </div>
    </header>
  );
}
