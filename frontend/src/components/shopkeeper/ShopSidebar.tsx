"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import { ShopDashboardMetrics } from "@/lib/api";
import {
  TripBlockIcon,
  TruckIcon,
  CheckIcon,
  StoreIcon,
  LogOutIcon,
  XIcon,
} from "@/components/Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface ShopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  metrics: ShopDashboardMetrics | null;
  onResetDemo: () => Promise<void>;
  isResettingDemo?: boolean;
}

export default function ShopSidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  metrics,
}: ShopSidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  const navItems = [
    {
      id: "available",
      label: "Available Trips",
      Icon: TripBlockIcon,
      badge: metrics?.available ? String(metrics.available) : null,
    },
    {
      id: "active",
      label: "Active Trips",
      Icon: TruckIcon,
      badge: metrics?.acceptedTrips ? String(metrics.acceptedTrips) : null,
    },
    {
      id: "completed",
      label: "Completed Trips",
      Icon: CheckIcon,
      badge: metrics?.completedTrips ? String(metrics.completedTrips) : null,
    },
    {
      id: "revenue",
      label: "Revenue",
      Icon: StoreIcon,
      badge: null,
    },
    {
      id: "acceptance",
      label: "Acceptance Rate",
      Icon: TripBlockIcon,
      badge: metrics?.acceptanceRate ? `${metrics.acceptanceRate}%` : null,
    },
    {
      id: "notifications",
      label: "Notifications",
      Icon: StoreIcon,
      badge: metrics?.unreadNotifications ? String(metrics.unreadNotifications) : null,
    },
  ];

  const content = (
    <div
      className={`flex flex-col h-full select-none ${jakarta.className}`}
      style={{
        background: "linear-gradient(180deg, #f5f2ec 0%, #eee9df 100%)",
        borderRight: "1px solid #d8d2c7",
      }}
    >
      {/* Wordmark Header */}
      <div
        className="h-16 px-6 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid #e8e4dc" }}
      >
        <div>
          <span
            className={`${cormorant.className} text-[21px] font-bold tracking-[0.14em] text-[#1c1e24] block leading-none`}
          >
            FARMLINK
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#8c8e96] block mt-1">
            Retail Partner
          </span>
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

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        <p className="px-3 pb-2 text-[9.5px] font-bold tracking-[0.16em] uppercase text-[#8c8e96]">
          Operations
        </p>

        {navItems.map(({ id, label, Icon, badge }) => {
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
              {active && (
                <span
                  className="absolute left-1 top-2 bottom-2 w-1 rounded-full"
                  style={{ background: "#c26d40" }}
                />
              )}

              <span
                className="transition-colors duration-150 pl-0.5"
                style={{ color: active ? "#c26d40" : "#8c8e96" }}
              >
                <Icon size={15} />
              </span>

              <span className="flex-1 text-left tracking-wide font-medium">
                {label}
              </span>

              {badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none ${
                    active
                      ? "bg-[#fff0e5] text-[#b84a0a] border border-[#f5c4a0]"
                      : "bg-[#ece8e0] text-[#7a7f8b]"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div
        className="p-4 shrink-0 space-y-3"
        style={{ borderTop: "1px solid #e8e4dc" }}
      >
        <div className="flex items-center justify-between px-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-[#1c1e24]">
              {metrics?.shopName || "Kisan Krishi Kendra"}
            </p>
            <p className="text-[10px] text-[#8c8e96]">
              {metrics?.village || "Rampura"}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#8c8e96] hover:text-[#b84a0a] transition-colors"
          >
            <LogOutIcon size={14} />
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
          className="absolute inset-0 backdrop-blur-xs bg-[#1c1e24]/40"
          onClick={onClose}
        />
        <div
          className={`absolute top-0 bottom-0 left-0 w-60 max-w-[85vw] shadow-2xl transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
}
