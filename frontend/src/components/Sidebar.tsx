"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  DashboardIcon,
  ShoppingBagIcon,
  TruckIcon,
  LogOutIcon,
  TripBlockIcon,
  StoreIcon,
  SettingsIcon,
  XIcon,
  MapPinIcon,
} from "./Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  groupLabel: string;
  items: {
    id: string;
    label: string;
    Icon: React.ComponentType<{ size?: number }>;
    badge?: string | null;
    isLive?: boolean;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "Operations",
    items: [
      { id: "overview",   label: "Overview",   Icon: DashboardIcon,  badge: null },
      { id: "orders",     label: "Orders",     Icon: ShoppingBagIcon,badge: "7" },
      { id: "tripblocks", label: "TripBlocks", Icon: TripBlockIcon,  badge: "4" },
    ],
  },
  {
    groupLabel: "Network & Logistics",
    items: [
      { id: "shops",    label: "Shops",    Icon: StoreIcon,  badge: "3" },
      { id: "delivery", label: "Delivery", Icon: TruckIcon,  badge: "3" },
      { id: "map",      label: "Live Map", Icon: MapPinIcon, badge: "Live", isLive: true },
    ],
  },
  {
    groupLabel: "System",
    items: [
      { id: "settings", label: "Settings", Icon: SettingsIcon, badge: null },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  const content = (
    <div
      className={`flex flex-col h-full select-none ${jakarta.className}`}
      style={{
        background: "linear-gradient(180deg, #f5f2ec 0%, #eee9df 100%)",
        borderRight: "1px solid #d8d2c7",
      }}
    >
      {/* ── WORDMARK HEADER ── */}
      <div
        className="h-16 px-5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid #e8e4dc" }}
      >
        <div className="flex items-center gap-2.5">
          <div>
            <span
              className={`${cormorant.className} text-[21px] font-bold tracking-[0.14em] text-[#1c1e24] block leading-none`}
            >
              FARMLINK
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8c8e96] block mt-0.5">
              Cooperative Hub
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden p-1.5 rounded-md transition-colors text-[#8c8e96] hover:text-[#1c1e24]"
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* ── NAVIGATION GROUPS ── */}
      <nav className="flex-1 px-3.5 py-5 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupLabel} className="space-y-1">
            <p className="px-3 text-[9.5px] font-bold tracking-[0.16em] uppercase text-[#8c8e96]">
              {group.groupLabel}
            </p>

            <div className="space-y-0.5">
              {group.items.map(({ id, label, Icon, badge, isLive }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleTabClick(id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group"
                    style={{
                      color: active ? "#1c1e24" : "#5a5f6b",
                      background: active ? "#ffffff" : "transparent",
                      border: active ? "1px solid #e2ddd5" : "1px solid transparent",
                      boxShadow: active
                        ? "0 1px 3px rgba(28, 30, 36, 0.04), 0 4px 12px rgba(194, 109, 64, 0.04)"
                        : "none",
                    }}
                  >
                    {/* Active Left Accent Pill */}
                    {active && (
                      <span
                        className="absolute left-1 top-2 bottom-2 w-1 rounded-full"
                        style={{ background: "#c26d40" }}
                      />
                    )}

                    <span
                      className="transition-colors duration-150 pl-0.5"
                      style={{
                        color: active ? "#c26d40" : "#8c8e96",
                      }}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="flex-1 text-left tracking-wide font-medium">
                      {label}
                    </span>

                    {badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex items-center gap-1 ${
                          isLive
                            ? "bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]"
                            : active
                            ? "bg-[#fff0e5] text-[#b84a0a] border border-[#f5c4a0]"
                            : "bg-[#ece8e0] text-[#7a7f8b]"
                        }`}
                      >
                        {isLive && (
                          <span
                            className="h-1.5 w-1.5 rounded-full live-dot"
                            style={{ background: "#3faa6e" }}
                          />
                        )}
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── PROFILE FOOTER CARD ── */}
      <div
        className="p-3.5 shrink-0 space-y-2.5"
        style={{ borderTop: "1px solid #e8e4dc" }}
      >
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl bg-white shadow-3xs"
          style={{ border: "1px solid #e5e1da" }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0"
            style={{
              background: "#faf2ed",
              color: "#c26d40",
              border: "1px solid #f0d8ca",
            }}
          >
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate text-[#1c1e24] leading-tight">
              {user.name}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c26d40] mt-0.5">
              {user.role === "admin" ? "Coordinator" : "Retail Partner"}
            </p>
          </div>
          <span
            className="h-2 w-2 rounded-full live-dot"
            style={{ background: "#3faa6e" }}
            title="Operational Online"
          />
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => handleTabClick("settings")}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#5a5f6b] hover:text-[#1c1e24] bg-white/70 hover:bg-white border border-[#e5e1da] transition-all"
          >
            <SettingsIcon size={12} />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#8c8e96] hover:text-[#b84a0a] bg-white/70 hover:bg-[#fff4ec] border border-[#e5e1da] hover:border-[#f5c4a0] transition-all"
          >
            <LogOutIcon size={12} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 backdrop-blur-sm bg-[#1c1e24]/40"
          onClick={onClose}
        />
        <div
          className={`absolute top-0 bottom-0 left-0 w-64 max-w-[85vw] shadow-2xl transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
}
