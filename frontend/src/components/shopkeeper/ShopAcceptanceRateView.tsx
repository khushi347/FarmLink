"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

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

interface ShopAcceptanceRateViewProps {
  acceptanceRate: number;
  availableCount: number;
  activeCount: number;
  completedCount: number;
}

export default function ShopAcceptanceRateView({
  acceptanceRate,
  availableCount,
  activeCount,
  completedCount,
}: ShopAcceptanceRateViewProps) {
  const totalClaimed = activeCount + completedCount;
  const totalOffered = availableCount + totalClaimed;

  return (
    <div className={`space-y-6 ${jakarta.className}`}>
      {/* Hero Card */}
      <div className="p-6 sm:p-8 rounded-xl bg-white border border-[#e5e1da]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Gauge & Score */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-xl bg-[#faf8f5]">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#e5e1da"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#c26d40"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * acceptanceRate) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`${cormorant.className} text-3xl font-semibold text-[#1c1e24]`}>
                  {acceptanceRate}%
                </span>
                <span className="text-[9.5px] font-medium uppercase tracking-wider text-[#8c8e96]">
                  Rate
                </span>
              </div>
            </div>

            <span className="mt-3 text-xs text-[#5a5f6b]">
              Reliable Retail Partner
            </span>
          </div>

          {/* Right: Explanatory Breakdown */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h3 className={`${cormorant.className} text-2xl font-semibold text-[#1c1e24]`}>
                Acceptance &amp; Fulfillment Rate
              </h3>
              <p className="text-xs text-[#5a5f6b] mt-1 leading-relaxed">
                Measures the percentage of regional corridors offered to your shop that you claim and deliver. Maintaining a consistent acceptance rate ensures continuous allocation of high-demand orders.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#ede9e2]">
                <p className="text-[10px] font-medium uppercase text-[#8c8e96]">Offered</p>
                <p className="text-base font-semibold text-[#1c1e24] mt-0.5">{totalOffered}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#ede9e2]">
                <p className="text-[10px] font-medium uppercase text-[#8c8e96]">Claimed</p>
                <p className="text-base font-semibold text-[#c26d40] mt-0.5">{totalClaimed}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#ede9e2]">
                <p className="text-[10px] font-medium uppercase text-[#8c8e96]">Completed</p>
                <p className="text-base font-semibold text-[#1f6e48] mt-0.5">{completedCount}</p>
              </div>
            </div>

            {availableCount > 0 && (
              <p className="text-xs text-[#8c8e96] pt-1">
                {availableCount} corridor{availableCount !== 1 ? "s" : ""} currently available to claim in your area.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
