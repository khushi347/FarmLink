"use client";

import React, { useState } from "react";
import { InfoIcon, XIcon } from "@/components/Icons";

export default function MapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-5 left-5 z-[500] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#e5e1da] shadow-md text-xs font-semibold flex items-center gap-1.5 text-[#5a5f6b] hover:text-[#1c1e24]"
      >
        <InfoIcon size={14} className="text-[#c26d40]" />
        <span>Map Legend</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-5 left-5 z-[500] bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-[#e5e1da] shadow-lg max-w-xs text-xs space-y-2.5 select-none">
      <div className="flex items-center justify-between border-b border-[#f0ece6] pb-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1c1e24]">
          Map Legend
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-[#8c8e96] hover:text-[#1c1e24] p-0.5"
          aria-label="Collapse legend"
        >
          <XIcon size={12} />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px] text-[#5a5f6b]">
        {/* Shop */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-[#c26d40] border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="M2 7h20v5H2z" />
            </svg>
          </div>
          <span>Retail Partner Shop (Fulfillment Hub)</span>
        </div>

        {/* Pending Order */}
        <div className="flex items-center gap-2">
          <div className="h-4.5 w-4.5 rounded-full bg-[#d48b28] border border-white flex items-center justify-center text-white font-extrabold text-[9px] shrink-0 shadow-xs">
            P
          </div>
          <span>Pending WhatsApp Order (Open for Grouping)</span>
        </div>

        {/* Grouped Order */}
        <div className="flex items-center gap-2">
          <div className="h-4.5 w-4.5 rounded-full bg-[#426890] border border-white flex items-center justify-center text-white font-extrabold text-[9px] shrink-0 shadow-xs">
            G
          </div>
          <span>Grouped Order (Assigned to TripBlock)</span>
        </div>

        {/* TripBlock */}
        <div className="flex items-center gap-2">
          <div className="px-1.5 py-0.5 rounded-full bg-[#1c1e24] border border-[#c26d40] text-white font-bold text-[9px] shrink-0">
            TB
          </div>
          <span>TripBlock Aggregation Center & Corridor</span>
        </div>
      </div>
    </div>
  );
}
