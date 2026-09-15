"use client";

import React, { useState } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function LogisticsSimulationPreview() {
  const [mode, setMode] = useState<"fragmented" | "farmlink">("farmlink");

  return (
    <section id="live-simulator" className="py-20 sm:py-28 bg-[#faf8f5] border-b border-[#e5e1da]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4f1eb] border border-[#e5e1da] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c26d40]" />
              <span
                className={`${jakarta.className} text-[11px] font-bold tracking-wider uppercase text-[#a85a32]`}
              >
                Corridor Consolidation
              </span>
            </div>
            <h2
              className={`${cormorant.className} text-3xl sm:text-5xl font-medium text-[#1c1e24] tracking-tight leading-tight`}
            >
              The power of <span className="italic">grouped journeys.</span>
            </h2>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="bg-[#e5e1da] p-1 rounded-xl inline-flex items-center">
            <button
              type="button"
              onClick={() => setMode("fragmented")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "fragmented"
                  ? "bg-white text-[#902020] shadow-sm"
                  : "text-[#5a5f6b] hover:text-[#1c1e24]"
              }`}
            >
              Traditional Dispatch (Fragmented)
            </button>
            <button
              type="button"
              onClick={() => setMode("farmlink")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "farmlink"
                  ? "bg-[#c26d40] text-white shadow-sm"
                  : "text-[#5a5f6b] hover:text-[#1c1e24]"
              }`}
            >
              FarmLink Intelligent Consolidation
            </button>
          </div>
        </div>

        {/* ── INTERACTIVE COMPARISON STAGE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Visual Route Canvas Representation */}
          <div className="lg:col-span-7 bg-[#ffffff] rounded-2xl border border-[#e5e1da] p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#f0ece6]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8c8e96]">
                  Simulation Arterial
                </span>
                <h4 className={`${cormorant.className} text-xl font-semibold text-[#1c1e24]`}>
                  Northern Agrarian Corridor (Sonipat — Murthal — Panipat)
                </h4>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                  mode === "farmlink"
                    ? "bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]"
                    : "bg-[#fff5f5] text-[#902020] border border-[#f0b0b0]"
                }`}
              >
                {mode === "farmlink" ? "1 Consolidated Run" : "3 Redundant Dispatches"}
              </span>
            </div>

            {/* SVG Corridor Route Visualization */}
            <div className="relative h-64 sm:h-72 w-full bg-[#faf8f5] rounded-xl border border-[#e5e1da] p-4 flex items-center justify-center">
              <svg
                viewBox="0 0 500 200"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background road line */}
                <path
                  d="M 50 100 Q 180 40, 270 120 T 450 100"
                  stroke="#d6d1c7"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {mode === "fragmented" ? (
                  <>
                    {/* Run 1 */}
                    <path
                      d="M 50 90 Q 180 30, 270 110"
                      stroke="#e57373"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      className="animate-dash-fast"
                    />
                    {/* Run 2 */}
                    <path
                      d="M 50 100 Q 180 40, 360 110"
                      stroke="#ba68c8"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      className="animate-dash-fast"
                    />
                    {/* Run 3 */}
                    <path
                      d="M 50 110 Q 180 50, 450 100"
                      stroke="#ffb74d"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      className="animate-dash-fast"
                    />
                  </>
                ) : (
                  <>
                    {/* Unified single FarmLink route */}
                    <path
                      d="M 50 100 Q 180 40, 270 120 T 450 100"
                      stroke="#1f6e48"
                      strokeWidth="4"
                      className="animate-dash-flow"
                    />
                  </>
                )}

                {/* Hub Point (Shop) */}
                <circle cx="50" cy="100" r="10" fill="#1c1e24" stroke="#ffffff" strokeWidth="3" />
                <text x="25" y="130" fontSize="10" fontWeight="bold" fill="#1c1e24">Partner Shop</text>

                {/* Farm Point 1 */}
                <circle
                  cx="200"
                  cy="65"
                  r="7"
                  fill={mode === "farmlink" ? "#c26d40" : "#e57373"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text x="170" y="50" fontSize="9" fontWeight="600" fill="#5a5f6b">Kheri Farm</text>

                {/* Farm Point 2 */}
                <circle
                  cx="320"
                  cy="125"
                  r="7"
                  fill={mode === "farmlink" ? "#c26d40" : "#ba68c8"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text x="290" y="150" fontSize="9" fontWeight="600" fill="#5a5f6b">Murthal Farm</text>

                {/* Farm Point 3 */}
                <circle
                  cx="450"
                  cy="100"
                  r="7"
                  fill={mode === "farmlink" ? "#c26d40" : "#ffb74d"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text x="420" y="125" fontSize="9" fontWeight="600" fill="#5a5f6b">Panipat Farm</text>
              </svg>
            </div>

            {/* Live simulation legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#5a5f6b] pt-3 border-t border-[#f0ece6]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1c1e24]" />
                  Partner Shops
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c26d40]" />
                  Nearby Farms
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#8c8e96]">
                {mode === "farmlink" ? "Optimized Multi-Stop Itinerary" : "Uncoordinated Individual Tripping"}
              </span>
            </div>
          </div>

          {/* Metrics & Impact Calculation Card */}
          <div className="lg:col-span-5 space-y-5">
            <div
              className={`editorial-card p-6 sm:p-7 border ${
                mode === "farmlink" ? "border-[#a8d8bc] bg-[#ffffff]" : "border-[#f0b0b0] bg-[#fffcfc]"
              }`}
            >
              <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24] mb-4`}>
                {mode === "farmlink" ? "FarmLink Efficiency Gains" : "Traditional Logistics Waste"}
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                  <span className="text-[#5a5f6b]">Total Corridor Travel</span>
                  <span
                    className={`font-bold ${
                      mode === "farmlink" ? "text-[#1f6e48]" : "text-[#902020]"
                    }`}
                  >
                    {mode === "farmlink" ? "41 km (1 vehicle)" : "118 km (3 vehicles)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                  <span className="text-[#5a5f6b]">Freight Overhead</span>
                  <span
                    className={`font-bold ${
                      mode === "farmlink" ? "text-[#1f6e48]" : "text-[#902020]"
                    }`}
                  >
                    {mode === "farmlink" ? "₹ 420 pooled" : "₹ 1,290 split"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                  <span className="text-[#5a5f6b]">Estimated CO₂ Footprint</span>
                  <span
                    className={`font-bold ${
                      mode === "farmlink" ? "text-[#1f6e48]" : "text-[#902020]"
                    }`}
                  >
                    {mode === "farmlink" ? "4.2 kg (–64%)" : "11.8 kg"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                  <span className="text-[#5a5f6b]">Shopkeeper Payout Safety</span>
                  <span
                    className={`font-bold ${
                      mode === "farmlink" ? "text-[#1f6e48]" : "text-[#902020]"
                    }`}
                  >
                    {mode === "farmlink" ? "Guaranteed + Locked" : "Uncertain"}
                  </span>
                </div>
              </div>

              {/* Status Note */}
              <div className="mt-6 pt-4 border-t border-[#e5e1da] text-xs text-[#5a5f6b] leading-relaxed">
                {mode === "farmlink" ? (
                  <p className="flex items-center gap-2 text-[#1f6e48] font-semibold">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Farms save 62% in freight costs; local shops earn predictable bulk earnings.
                  </p>
                ) : (
                  <p className="text-[#902020] font-semibold">
                    Multiple vehicles emit redundant carbon and charge individual premium delivery fees.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
