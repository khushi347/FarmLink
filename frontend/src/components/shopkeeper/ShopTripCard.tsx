"use client";

import React, { useState } from "react";
import { ShopTrip } from "@/lib/api";
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

interface ShopTripCardProps {
  trip: ShopTrip;
  onClaim?: (tripId: string) => Promise<void>;
  onComplete?: (tripId: string) => Promise<void>;
  isClaiming?: boolean;
  isCompleting?: boolean;
  justClaimed?: boolean;
}

export default function ShopTripCard({
  trip,
  onClaim,
  onComplete,
  isClaiming = false,
  isCompleting = false,
  justClaimed = false,
}: ShopTripCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isAvailable = trip.status === "OPEN";
  const isClaimed = trip.status === "CLAIMED" || justClaimed;
  const isCompleted = trip.status === "COMPLETED";

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClaim && !isClaiming) {
      await onClaim(trip._id || trip.id);
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete && !isCompleting) {
      await onComplete(trip._id || trip.id);
    }
  };

  return (
    <div
      className={`rounded-xl transition-all duration-200 bg-white border ${jakarta.className} ${
        justClaimed
          ? "border-[#a8d8bc] bg-[#fafcfb]"
          : "border-[#e5e1da] hover:border-[#d6d1c7]"
      }`}
    >
      <div className="p-6 space-y-4">
        {/* Header: Trip Code & Type */}
        <div className="flex items-baseline justify-between border-b border-[#f0ece6] pb-3">
          <div>
            <h3
              className={`${cormorant.className} text-2xl font-medium tracking-tight text-[#1c1e24]`}
            >
              {trip.code}
            </h3>
            <p className="text-xs text-[#8c8e96] mt-0.5">
              {trip.village || "Rampura"} Corridor
            </p>
          </div>

          <span className="text-[11px] font-medium text-[#5a5f6b] px-2 py-0.5 rounded bg-[#faf8f5] border border-[#e5e1da]">
            {trip.serviceType}
          </span>
        </div>

        {/* Core Attributes: Clean, spacious typography without heavy box clutter */}
        <div className="grid grid-cols-3 gap-3 pt-1 text-left">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8c8e96]">
              Orders
            </p>
            <p className="text-sm font-semibold text-[#1c1e24] mt-0.5">
              {trip.orderCount} Orders
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8c8e96]">
              Distance
            </p>
            <p className="text-sm font-semibold text-[#1c1e24] mt-0.5">
              {trip.distanceKm} km
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8c8e96]">
              Earnings
            </p>
            <p className="text-sm font-semibold text-[#1f6e48] mt-0.5">
              ₹{trip.estimatedEarnings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Claimed Banner state */}
        {justClaimed && (
          <div className="p-3 rounded-lg bg-[#eef7f2] border border-[#a8d8bc] text-xs text-[#1f6e48] space-y-0.5">
            <p className="font-semibold">✓ Trip Claimed</p>
            <p className="text-[11px] text-[#2d6e4b]">
              This trip is no longer available to other shops.
            </p>
          </div>
        )}

        {/* Action Button Strip */}
        <div className="flex items-center justify-between pt-2 border-t border-[#f0ece6]">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-[#8c8e96] hover:text-[#1c1e24] transition-colors"
          >
            {showDetails ? "Hide Details" : "Package Details"}
          </button>

          <div>
            {isAvailable && !justClaimed && (
              <button
                type="button"
                onClick={handleClaim}
                disabled={isClaiming}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#c26d40] hover:bg-[#b05f33] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isClaiming ? "Claiming…" : "Claim Trip"}
              </button>
            )}

            {isClaimed && !justClaimed && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#1f6e48] hover:bg-[#1a5e3d] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isCompleting ? "Completing…" : "Mark Delivery Completed"}
              </button>
            )}

            {isCompleted && (
              <span className="text-xs font-medium text-[#1f6e48] bg-[#eef7f2] px-2.5 py-1 rounded border border-[#a8d8bc]">
                Delivered · ₹{trip.estimatedEarnings}
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Order Package Breakdown */}
        {showDetails && (
          <div className="pt-3 border-t border-[#f0ece6] space-y-2 text-xs">
            <p className="text-[10px] uppercase font-medium tracking-wider text-[#8c8e96]">
              Fulfillment Packages
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {trip.orders && trip.orders.length > 0 ? (
                trip.orders.map((ord: any, idx: number) => (
                  <div
                    key={ord._id || idx}
                    className="p-2 rounded bg-[#faf8f5] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-[#1c1e24]">
                        {ord.farmer?.name || `Farmer #${idx + 1}`}
                      </span>
                      <p className="text-[11px] text-[#8c8e96]">
                        {ord.products && ord.products.length > 0
                          ? ord.products
                              .map((p: any) => `${p.quantity} ${p.unit || "kg"} ${p.name}`)
                              .join(", ")
                          : "Package Items"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#8c8e96]">
                  {trip.orderCount} delivery items in {trip.village} corridor.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
