"use client";

import React from "react";
import { MapStats } from "@/types/map";
import { Cormorant_Garamond } from "next/font/google";
import { StoreIcon, ShoppingBagIcon, TripBlockIcon, TruckIcon } from "@/components/Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

interface MapStatsBarProps {
  stats: MapStats;
}

export default function MapStatsBar({ stats }: MapStatsBarProps) {
  const items = [
    {
      label: "Retail Shops",
      val: stats.totalShops,
      sub: "Active Fulfillment Hubs",
      Icon: StoreIcon,
      accent: "#c26d40",
      live: false,
    },
    {
      label: "Farmer Orders",
      val: stats.totalOrders,
      sub: `${stats.pendingOrders} pending grouping`,
      Icon: ShoppingBagIcon,
      accent: "#d48b28",
      live: true,
    },
    {
      label: "TripBlocks Plotted",
      val: stats.openTripBlocks + stats.claimedTripBlocks,
      sub: `${stats.openTripBlocks} open for claims`,
      Icon: TripBlockIcon,
      accent: "#426890",
      live: true,
    },
    {
      label: "Completed Trips",
      val: stats.completedTripBlocks,
      sub: "Fulfilled corridors",
      Icon: TruckIcon,
      accent: "#1f6e48",
      live: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((m) => {
        const Icon = m.Icon;
        return (
          <div
            key={m.label}
            className="warm-card p-3.5 flex items-start justify-between"
            style={{ borderLeft: `3px solid ${m.accent}` }}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8e96]">
                  {m.label}
                </span>
                {m.live && <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: m.accent }} />}
              </div>
              <p className={`${cormorant.className} text-2xl font-bold tracking-tight text-[#1c1e24] leading-tight`}>
                {m.val}
              </p>
              <p className="text-[10px] font-medium text-[#8c8e96] mt-0.5">{m.sub}</p>
            </div>
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "#faf8f5", border: "1px solid #e5e1da", color: m.accent }}
            >
              <Icon size={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
