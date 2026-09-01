"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import {
  DashboardIcon,
  ShoppingBagIcon,
  TruckIcon,
  LogOutIcon,
  BrainIcon,
  WhatsAppIcon,
  TripBlockIcon,
  StoreIcon,
  SettingsIcon,
  XIcon,
} from "./Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["700"],
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

const NAV_ITEMS = [
  { id: "overview",    label: "Overview",        Icon: DashboardIcon,  badge: null  },
  { id: "intake",      label: "WhatsApp Intake",  Icon: WhatsAppIcon,   badge: "18"  },
  { id: "orders",      label: "Orders",           Icon: ShoppingBagIcon,badge: "7"   },
  { id: "tripblocks",  label: "TripBlocks",       Icon: TripBlockIcon,  badge: "4"   },
  { id: "shops",       label: "Shops",            Icon: StoreIcon,      badge: null  },
  { id: "delivery",    label: "Delivery",         Icon: TruckIcon,      badge: "3"   },
  { id: "ai-insights", label: "AI Insights",      Icon: BrainIcon,      badge: null  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleTabClick = (id: string) => { setActiveTab(id); onClose(); };

  // Sidebar uses the same warm dark tone as the login page's dark elements (#2c3e50)
  const content = (
    <div
      className={`flex flex-col h-full select-none ${jakarta.className}`}
      style={{ background: "#1e2530", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* ── WORDMARK ── */}
      <div
        className="h-16 px-6 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Leaf + FARMLINK — mirrors the login page logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "rgba(194,109,64,0.15)", border: "1px solid rgba(194,109,64,0.25)" }}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" style={{ color: "#c26d40" }}>
              <path d="M3 13C3 7 8 3 13 3C13 8 8 13 3 13Z" fill="currentColor" fillOpacity="0.9" />
              <path d="M3 13L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className={`${cormorant.className} text-[22px] font-bold tracking-widest text-white`}>
            FARMLINK
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden p-1.5 rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p
          className="px-3 mb-3 text-[9px] font-bold tracking-[0.18em] uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Workspace
        </p>

        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabClick(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  color:      active ? "#ffffff" : "rgba(255,255,255,0.45)",
                  background: active ? "rgba(194,109,64,0.15)" : "transparent",
                  border:     active ? "1px solid rgba(194,109,64,0.22)" : "1px solid transparent",
                }}
              >
                <span style={{ color: active ? "#c26d40" : "rgba(255,255,255,0.3)" }}>
                  <Icon size={15} />
                </span>
                <span className="flex-1 text-left tracking-wide">{label}</span>
                {badge && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{
                      background: active ? "rgba(194,109,64,0.2)" : "rgba(255,255,255,0.08)",
                      color:      active ? "#e8986a" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {badge}
                  </span>
                )}
                {active && (
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: "#c26d40" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── PROFILE FOOTER ── */}
      <div
        className="px-3 pb-4 pt-3 shrink-0 space-y-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* User pill */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0"
            style={{
              background: "rgba(194,109,64,0.18)",
              color: "#e8986a",
              border: "1px solid rgba(194,109,64,0.25)",
            }}
          >
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
              {user.name}
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: "#c26d40" }}
            >
              {user.role === "admin" ? "Coordinator" : "Retail Partner"}
            </p>
          </div>
          {/* Online dot */}
          <span className="h-2 w-2 rounded-full live-dot" style={{ background: "#5fbc82" }} />
        </div>

        {/* Action row */}
        <div className="flex gap-1.5">
          {[
            { Icon: SettingsIcon, label: "Settings", onClick: () => {} },
            { Icon: LogOutIcon,   label: "Sign Out",  onClick: logout },
          ].map(({ Icon, label, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                color: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = label === "Sign Out" ? "#e8986a" : "rgba(255,255,255,0.75)";
                (e.currentTarget as HTMLButtonElement).style.background = label === "Sign Out" ? "rgba(194,109,64,0.1)" : "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-60 h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{ background: "rgba(28,30,36,0.55)" }}
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
