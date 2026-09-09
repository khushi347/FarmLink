"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import {
  analyticsApi,
  PlatformAnalyticsData,
  LogisticsAnalyticsData,
} from "@/lib/api";
import {
  TrendingUpIcon,
  TruckIcon,
  ShoppingBagIcon,
  StoreIcon,
  FuelIcon,
  DollarSignIcon,
  AlertTriangleIcon,
} from "../Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface AnalyticsDashboardProps {
  token?: string;
}

export default function AnalyticsDashboard({ token }: AnalyticsDashboardProps) {
  const [days, setDays] = useState<number>(14);
  const [platformData, setPlatformData] = useState<PlatformAnalyticsData | null>(null);
  const [logisticsData, setLogisticsData] = useState<LogisticsAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; total: number; grouped: number } | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [platformRes, logisticsRes] = await Promise.all([
        analyticsApi.getPlatform({ days }, token),
        analyticsApi.getLogistics(token),
      ]);

      if (platformRes.success) setPlatformData(platformRes.data);
      if (logisticsRes.success) setLogisticsData(logisticsRes.data);
    } catch (err: any) {
      console.error("[Analytics] Error loading analytics:", err);
      setError(err?.message || "Failed to load platform and logistics analytics");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !platformData) {
    return (
      <div className={`p-8 flex flex-col items-center justify-center min-h-[400px] ${jakarta.className}`}>
        <div className="h-8 w-8 rounded-full border-[2px] animate-spin border-[#c26d40] border-t-transparent" />
        <p className={`${cormorant.className} text-lg italic text-[#8c8e96] mt-3`}>
          Aggregating platform metrics &amp; delivery savings…
        </p>
      </div>
    );
  }

  if (error && !platformData) {
    return (
      <div className="p-6 rounded-xl bg-[#fff5f5] border border-[#f0b0b0] text-[#902020] text-xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertTriangleIcon size={16} />
          <span>Error loading analytics</span>
        </div>
        <p>{error}</p>
        <button
          type="button"
          onClick={loadAnalytics}
          className="mt-3 px-3 py-1.5 rounded-lg bg-[#902020] text-white font-semibold text-xs hover:bg-[#701010]"
        >
          Retry
        </button>
      </div>
    );
  }

  const pSummary = platformData?.summary;
  const lData = logisticsData;

  // Visual Bar Calculation for Distance Comparison
  const indivDist = lData?.totalIndividualDistanceKm || 0;
  const sharedDist = lData?.totalSharedDistanceKm || 0;
  const savedDist = lData?.totalDistanceSavedKm || 0;
  const savedPct = lData?.distanceSavedPercentage || 0;

  // Timeseries SVG Chart Calculations
  const timeseries = platformData?.timeseries || [];
  const maxOrders = Math.max(1, ...timeseries.map((d) => d.totalOrders));
  const chartHeight = 160;
  const chartWidth = 640;
  const barGap = 6;
  const barWidth = timeseries.length > 0 ? Math.max(8, (chartWidth - (timeseries.length - 1) * barGap) / timeseries.length) : 20;

  return (
    <div className={`space-y-7 ${jakarta.className}`}>
      {/* ── HEADER STRIP WITH DAYS FILTER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e5e1da]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-[#1c1e24]`}>
              Analytics &amp; Delivery Savings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
              Module 18
            </span>
          </div>
          <p className="text-xs text-[#5a5f6b] mt-0.5">
            Operational aggregation, batched routing efficiency, and cooperative logistics cost savings.
          </p>
        </div>

        {/* Days selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#e5e1da] shadow-3xs">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? "bg-[#c26d40] text-white shadow-sm"
                  : "text-[#5a5f6b] hover:text-[#1c1e24] hover:bg-[#faf8f5]"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* ── PLATFORM KPI CARDS ROW (Module 18 Core Analytics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Daily Orders */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#c26d40] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Daily Orders</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c26d40]" />
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#1c1e24]`}>
            {pSummary?.dailyOrdersToday ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            {pSummary?.totalOrders ?? 0} lifetime orders
          </p>
        </div>

        {/* 2. Orders Grouped */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#b84a0a] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Orders Grouped</span>
            <span className="text-[10px] font-bold text-[#b84a0a] bg-[#fff4ec] px-1.5 rounded">
              {pSummary?.ordersGroupedPercentage ?? 0}%
            </span>
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#b84a0a]`}>
            {pSummary?.ordersGrouped ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            Batched into corridors
          </p>
        </div>

        {/* 3. Trips Created */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#234e72] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Trips Created</span>
            <TruckIcon size={14} className="text-[#234e72]" />
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#234e72]`}>
            {pSummary?.tripsCreated ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            TripBlocks generated
          </p>
        </div>

        {/* 4. Active Shops */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#1f6e48] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Active Shops</span>
            <StoreIcon size={14} className="text-[#1f6e48]" />
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#1f6e48]`}>
            {pSummary?.activeShops ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            Partner retail hubs
          </p>
        </div>

        {/* 5. Completed Deliveries */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#3a7030] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Completed</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#3a7030]" />
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#1c1e24]`}>
            {pSummary?.completedDeliveries ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            Fulfilled corridors
          </p>
        </div>

        {/* 6. Average Orders / Trip */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e1da] border-l-[3px] border-l-[#8a5a00] shadow-3xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">Avg Orders / Trip</span>
            <ShoppingBagIcon size={14} className="text-[#8a5a00]" />
          </div>
          <p className={`${cormorant.className} text-3xl font-bold text-[#8a5a00]`}>
            {pSummary?.averageOrdersPerTrip ?? 0}
          </p>
          <p className="text-[10px] text-[#8c8e96] mt-0.5">
            Batching density
          </p>
        </div>
      </div>

      {/* ── LOGISTICS METRICS ⭐ & DELIVERY SAVINGS HERO CARD ── */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#e5e1da] shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#fff0e5] text-[#c26d40] border border-[#f5c4a0]">
                <TrendingUpIcon size={20} />
              </span>
              <div>
                <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24]`}>
                  Logistics &amp; Delivery Savings Engine
                </h3>
                <p className="text-xs text-[#5a5f6b] mt-0.5">
                  Algorithmic proof of cooperative clustering: Shared sequential routing vs. unbatched direct deliveries.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fdfaf5] border border-[#ede7dc] text-[11px] font-medium text-[#7a7469]">
            <span>One-way dispatch baseline</span>
            <span className="text-[#c26d40] font-bold">·</span>
            <span>Module 15 Geo Engine</span>
          </div>
        </div>

        {/* 4 Core Savings Metric Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Individual Distance */}
          <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#ede9e2]">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">
              Est. Individual Delivery Distance
            </p>
            <p className={`${cormorant.className} text-3xl font-bold text-[#7a4030] mt-1`}>
              {indivDist} <span className="text-sm font-sans font-normal text-[#8c8e96]">km</span>
            </p>
            <p className="text-[11px] text-[#8c8e96] mt-1 leading-snug">
              Σ direct dispatches for {lData?.totalDeliveries ?? 0} individual farmer orders
            </p>
          </div>

          {/* Shared Distance */}
          <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#ede9e2]">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#8c8e96]">
              Shared Sequential Route Distance
            </p>
            <p className={`${cormorant.className} text-3xl font-bold text-[#234e72] mt-1`}>
              {sharedDist} <span className="text-sm font-sans font-normal text-[#8c8e96]">km</span>
            </p>
            <p className="text-[11px] text-[#8c8e96] mt-1 leading-snug">
              Optimized multi-stop corridor loops across {lData?.totalTripsEvaluated ?? 0} trips
            </p>
          </div>

          {/* Distance Saved */}
          <div className="p-4 rounded-xl bg-[#f4faf6] border border-[#cbe4d4]">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1f6e48]">
                Est. Distance Saved
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1f6e48] text-white">
                -{savedPct}%
              </span>
            </div>
            <p className={`${cormorant.className} text-3xl font-bold text-[#1f6e48] mt-1`}>
              {savedDist} <span className="text-sm font-sans font-normal text-[#1f6e48]">km</span>
            </p>
            <p className="text-[11px] text-[#3faa6e] mt-1 font-semibold leading-snug">
              Saved road kilometers avoided
            </p>
          </div>

          {/* Cost & Fuel Saved */}
          <div className="p-4 rounded-xl bg-[#fffaf5] border border-[#f5d9c2]">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#b84a0a]">
              Est. Fuel &amp; Transit Cost Saved
            </p>
            <p className={`${cormorant.className} text-3xl font-bold text-[#b84a0a] mt-1`}>
              ₹{lData?.estimatedDeliveryCostSavedInr?.toLocaleString() ?? 0}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8c8e96] mt-1">
              <FuelIcon size={12} className="text-[#c26d40]" />
              <span>₹{lData?.estimatedFuelSavedInr?.toLocaleString() ?? 0} fuel saved</span>
            </div>
          </div>
        </div>

        {/* Visual Dual-Bar Route Comparison Visualizer */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#faf8f5] border border-[#ede9e2] space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1c1e24]">
            <span>Route Efficiency Comparison</span>
            <span className="text-[#1f6e48] font-bold">{savedDist} km eliminated via grouping</span>
          </div>

          <div className="space-y-2">
            {/* Bar 1: Individual Baseline */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#7a4030]">
                <span>Unbatched Direct Dispatches (Baseline)</span>
                <span className="font-bold">{indivDist} km</span>
              </div>
              <div className="h-3.5 w-full bg-[#ede5db] rounded-full overflow-hidden">
                <div className="h-full bg-[#d68560] rounded-full transition-all duration-500" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Bar 2: Shared FarmLink Loop */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#1f6e48]">
                <span>FarmLink Sequenced Multi-Stop Route</span>
                <span className="font-bold">{sharedDist} km ({100 - savedPct}% of baseline)</span>
              </div>
              <div className="h-3.5 w-full bg-[#ede5db] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#1f6e48] rounded-l-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, (sharedDist / (indivDist || 1)) * 100))}%` }}
                />
                <div
                  className="h-full bg-[#82c99f]/40 transition-all duration-500 border-l border-dashed border-[#1f6e48]"
                  style={{ width: `${Math.min(100, Math.max(0, (savedDist / (indivDist || 1)) * 100))}%` }}
                  title={`${savedDist} km saved`}
                />
              </div>
            </div>
          </div>

          {/* Model Assumptions & Disclaimer Strip */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[10.5px] text-[#8c8e96] border-t border-[#ede9e2]">
            <div className="flex items-center gap-3">
              <span>Configurable Cost: <strong>₹{lData?.assumptions?.fuelCostPerKm ?? 3.5}/km</strong> fuel · <strong>₹{lData?.assumptions?.deliveryCostPerKm ?? 8.5}/km</strong> logistics</span>
            </div>
            <p className="italic">
              * Note: Values represent estimated savings based on radial dispatch vs. sequenced route math, not actual vehicle GPS odometer or recorded fuel receipts.
            </p>
          </div>
        </div>
      </div>

      {/* ── DAILY ORDERS & GROUPING TREND (Pure SVG Chart) ── */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#e5e1da] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24]`}>
              Daily Orders &amp; Grouping Trend
            </h3>
            <p className="text-xs text-[#5a5f6b] mt-0.5">
              Daily incoming order volume vs. orders clustered into regional TripBlocks over the past {days} days.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-[#5a5f6b]">
              <span className="h-3 w-3 rounded bg-[#c26d40]" />
              <span>Total Orders</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#5a5f6b]">
              <span className="h-3 w-3 rounded bg-[#1f6e48]" />
              <span>Grouped Orders</span>
            </div>
          </div>
        </div>

        {/* Hover info banner */}
        <div className="h-6 flex items-center text-xs">
          {hoveredDay ? (
            <span className="text-[#1c1e24] font-semibold bg-[#faf8f5] px-2.5 py-0.5 rounded border border-[#ede9e2]">
              📅 {hoveredDay.date}: <strong>{hoveredDay.total}</strong> orders placed · <strong>{hoveredDay.grouped}</strong> grouped ({hoveredDay.total > 0 ? Math.round((hoveredDay.grouped / hoveredDay.total) * 100) : 0}%)
            </span>
          ) : (
            <span className="text-[#8c8e96] text-[11px]">Hover over any day bar to inspect exact volume</span>
          )}
        </div>

        {/* Responsive SVG Chart Container */}
        <div className="overflow-x-auto pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
            className="w-full min-w-[560px] h-[195px] select-none"
          >
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - ratio * chartHeight + 10;
              const val = Math.round(maxOrders * ratio);
              return (
                <g key={ratio}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#f0ece6" strokeWidth="1" />
                  <text x={chartWidth - 5} y={y - 3} textAnchor="end" fontSize="9" fill="#a0a4ae">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {timeseries.map((item, idx) => {
              const x = idx * (barWidth + barGap);
              const totalBarHeight = maxOrders > 0 ? (item.totalOrders / maxOrders) * chartHeight : 0;
              const groupedBarHeight = maxOrders > 0 ? (item.groupedOrders / maxOrders) * chartHeight : 0;
              const yTotal = chartHeight - totalBarHeight + 10;
              const yGrouped = chartHeight - groupedBarHeight + 10;

              const isHovered = hoveredDay?.date === item.date;

              return (
                <g
                  key={item.date}
                  className="cursor-pointer group"
                  onMouseEnter={() =>
                    setHoveredDay({
                      date: item.date,
                      total: item.totalOrders,
                      grouped: item.groupedOrders,
                    })
                  }
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Background highlight pill on hover */}
                  {isHovered && (
                    <rect
                      x={x - 2}
                      y="5"
                      width={barWidth + 4}
                      height={chartHeight + 25}
                      fill="#faf3ec"
                      rx="4"
                    />
                  )}

                  {/* Total Orders Bar */}
                  <rect
                    x={x}
                    y={yTotal}
                    width={barWidth}
                    height={Math.max(2, totalBarHeight)}
                    fill={isHovered ? "#b84a0a" : "#c26d40"}
                    rx="3"
                    className="transition-all duration-150"
                  />

                  {/* Grouped Orders Overlay Bar */}
                  <rect
                    x={x}
                    y={yGrouped}
                    width={barWidth}
                    height={Math.max(0, groupedBarHeight)}
                    fill={isHovered ? "#165437" : "#1f6e48"}
                    rx="3"
                    className="transition-all duration-150"
                  />

                  {/* Date Label (short format e.g. "09/04") */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 25}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight={isHovered ? "bold" : "normal"}
                    fill={isHovered ? "#1c1e24" : "#8c8e96"}
                  >
                    {item.date.slice(5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── CORRIDOR BREAKDOWN & EFFICIENCY TABLE ── */}
      <div className="bg-white rounded-2xl border border-[#e5e1da] shadow-sm overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-[#e5e1da] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24]`}>
              Corridor Efficiency &amp; Savings Breakdown
            </h3>
            <p className="text-xs text-[#5a5f6b] mt-0.5">
              Geospatial delivery savings grouped by regional dispatch corridor.
            </p>
          </div>

          <span className="text-xs text-[#8c8e96]">
            {lData?.corridorBreakdown?.length || 0} corridors active
          </span>
        </div>

        {!lData?.corridorBreakdown || lData.corridorBreakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8c8e96]">
            No corridor trips evaluated yet. Create and group orders to generate corridor efficiency analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f5] text-[#8c8e96] font-semibold uppercase tracking-wider text-[10px] border-b border-[#e5e1da]">
                <tr>
                  <th className="px-6 py-3">Regional Corridor</th>
                  <th className="px-6 py-3">Trips</th>
                  <th className="px-6 py-3">Deliveries</th>
                  <th className="px-6 py-3">Shared Route</th>
                  <th className="px-6 py-3">Indiv. Baseline</th>
                  <th className="px-6 py-3">Distance Saved</th>
                  <th className="px-6 py-3 text-right">Est. Cost Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece6]">
                {lData.corridorBreakdown.map((c) => {
                  const savedPct = c.individualDistanceKm > 0
                    ? Math.round((c.distanceSavedKm / c.individualDistanceKm) * 100)
                    : 0;

                  return (
                    <tr key={c.corridor} className="hover:bg-[#faf8f5]/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1c1e24]">
                        {c.corridor}
                      </td>
                      <td className="px-6 py-4 text-[#5a5f6b]">
                        {c.tripsCount}
                      </td>
                      <td className="px-6 py-4 text-[#5a5f6b]">
                        {c.deliveriesCount} orders
                      </td>
                      <td className="px-6 py-4 font-medium text-[#234e72]">
                        {c.sharedDistanceKm} km
                      </td>
                      <td className="px-6 py-4 text-[#8c8e96]">
                        {c.individualDistanceKm} km
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                          {c.distanceSavedKm} km (-{savedPct}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1f6e48]">
                        + ₹{c.savedCostInr.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
