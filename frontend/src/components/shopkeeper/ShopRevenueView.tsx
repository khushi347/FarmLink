"use client";

import React from "react";
import { ShopRevenueData } from "@/lib/api";
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

interface ShopRevenueViewProps {
  revenueData: ShopRevenueData | null;
  onViewTrips: () => void;
}

export default function ShopRevenueView({
  revenueData,
  onViewTrips,
}: ShopRevenueViewProps) {
  const totalRevenue = revenueData?.totalRevenue || 0;
  const completedCount = revenueData?.completedTripsCount || 0;
  const avgEarnings = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
  const trips = revenueData?.trips || [];

  return (
    <div className={`space-y-6 ${jakarta.className}`}>
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#e5e1da]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8c8e96]">
            Total Revenue
          </p>
          <p
            className={`${cormorant.className} text-3xl sm:text-4xl font-semibold text-[#1f6e48] mt-2`}
          >
            ₹{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-[#8c8e96] mt-1">
            {completedCount} fulfilled deliveries
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e5e1da]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8c8e96]">
            Completed Trips
          </p>
          <p
            className={`${cormorant.className} text-3xl sm:text-4xl font-semibold text-[#1c1e24] mt-2`}
          >
            {completedCount}
          </p>
          <p className="text-xs text-[#8c8e96] mt-1">
            Successfully delivered to farmers
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e5e1da]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8c8e96]">
            Average Per Trip
          </p>
          <p
            className={`${cormorant.className} text-3xl sm:text-4xl font-semibold text-[#1c1e24] mt-2`}
          >
            ₹{avgEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-[#8c8e96] mt-1">
            Average corridor return
          </p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-xl border border-[#e5e1da] overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-[#e5e1da] flex items-center justify-between">
          <div>
            <h3
              className={`${cormorant.className} text-2xl font-semibold text-[#1c1e24]`}
            >
              Payout History
            </h3>
            <p className="text-xs text-[#8c8e96] mt-0.5">
              Settled earnings for completed corridors
            </p>
          </div>

          <button
            type="button"
            onClick={onViewTrips}
            className="text-xs font-medium text-[#c26d40] hover:underline"
          >
            View Completed Trips →
          </button>
        </div>

        {trips.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8c8e96]">
            No completed trips yet. Claim and fulfill open trips to generate revenue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf8f5] text-[#8c8e96] font-medium uppercase tracking-wider text-[10px] border-b border-[#e5e1da]">
                <tr>
                  <th className="px-6 py-3">Trip ID</th>
                  <th className="px-6 py-3">Corridor</th>
                  <th className="px-6 py-3">Packages</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Completed On</th>
                  <th className="px-6 py-3 text-right">Payout Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece6]">
                {trips.map((trip) => (
                  <tr key={trip._id || trip.id} className="hover:bg-[#faf8f5]/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1c1e24]">
                      {trip.code}
                    </td>
                    <td className="px-6 py-4 text-[#5a5f6b]">
                      {trip.village}
                    </td>
                    <td className="px-6 py-4 text-[#5a5f6b]">
                      {trip.orderCount} Orders
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#faf8f5] border border-[#e5e1da] text-[#5a5f6b]">
                        {trip.serviceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#8c8e96]">
                      {trip.completedAt
                        ? new Date(trip.completedAt).toLocaleDateString()
                        : "Today"}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1f6e48]">
                      + ₹{trip.estimatedEarnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
