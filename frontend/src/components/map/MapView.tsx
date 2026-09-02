"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Cormorant_Garamond } from "next/font/google";
import { mapApi } from "@/lib/api";
import {
  MapShop,
  MapOrder,
  MapTripBlock,
  MapStats,
  MapFilterState,
  SelectedMapEntity,
} from "@/types/map";
import MapStatsBar from "./MapStatsBar";
import MapControls from "./MapControls";
import MapInspector from "./MapInspector";
import MapLegend from "./MapLegend";
import { AlertTriangleIcon, CrosshairIcon } from "@/components/Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Dynamic SSR-safe import for Leaflet map canvas
const FarmLinkMap = dynamic(() => import("./FarmLinkMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#faf8f5] rounded-xl border border-[#e5e1da]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-7 w-7 rounded-full border-[2px] animate-spin"
          style={{ borderColor: "#c26d40", borderTopColor: "transparent" }}
        />
        <p className="text-xs text-[#8c8e96] font-medium">
          Loading OpenStreetMap tiles…
        </p>
      </div>
    </div>
  ),
});

export default function MapView() {
  const [shops, setShops] = useState<MapShop[]>([]);
  const [orders, setOrders] = useState<MapOrder[]>([]);
  const [tripBlocks, setTripBlocks] = useState<MapTripBlock[]>([]);
  const [stats, setStats] = useState<MapStats>({
    totalShops: 0,
    totalOrders: 0,
    pendingOrders: 0,
    groupedOrders: 0,
    openTripBlocks: 0,
    claimedTripBlocks: 0,
    completedTripBlocks: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MapFilterState>({
    layer: "all",
    serviceType: "ALL",
    status: "ALL",
    searchQuery: "",
  });

  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);
  const [mapKey, setMapKey] = useState(0);

  // Fetch geographic data from backend
  const loadMapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await mapApi.getMapData();
      if (res.success && res.data) {
        setShops(res.data.shops || []);
        setOrders(res.data.orders || []);
        setTripBlocks(res.data.tripBlocks || []);
        setStats(
          res.data.stats || {
            totalShops: res.data.shops?.length || 0,
            totalOrders: res.data.orders?.length || 0,
            pendingOrders: 0,
            groupedOrders: 0,
            openTripBlocks: 0,
            claimedTripBlocks: 0,
            completedTripBlocks: 0,
          }
        );
      } else {
        throw new Error(res.message || "Failed to load map data");
      }
    } catch (err: any) {
      console.error("Map fetch error:", err);
      setError(err.message || "Unable to reach map service.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Extract unique service categories
  const serviceCategories = useMemo(() => {
    const categories = new Set<string>();
    shops.forEach((s) => s.category?.forEach((c) => categories.add(c)));
    orders.forEach((o) => o.serviceType && categories.add(o.serviceType));
    tripBlocks.forEach((t) => t.serviceType && categories.add(t.serviceType));
    return Array.from(categories).sort();
  }, [shops, orders, tripBlocks]);

  // Handle reset view
  const handleResetView = () => {
    setSelectedEntity(null);
    setFilters({
      layer: "all",
      serviceType: "ALL",
      status: "ALL",
      searchQuery: "",
    });
    setMapKey((k) => k + 1);
  };

  return (
    <div className="space-y-4 page-enter">
      {/* Title & Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`${cormorant.className} text-2xl font-semibold tracking-wide text-[#1c1e24]`}>
            Live Geographic Map
          </h2>
          <p className="text-xs text-[#8c8e96] font-light">
            Real-time visual map of FarmLink WhatsApp intake points, aggregation TripBlocks, and retail partner shops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
          >
            <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: "#3faa6e" }} />
            OpenStreetMap Active
          </span>
          <button
            type="button"
            onClick={loadMapData}
            className="btn-ghost h-8 px-3 rounded-lg text-xs font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <MapStatsBar stats={stats} />

      {/* Controls */}
      <MapControls
        filters={filters}
        onChangeFilters={setFilters}
        onResetView={handleResetView}
        serviceCategories={serviceCategories}
      />

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-xl bg-[#fff5f5] border border-[#f0b0b0] flex items-center justify-between gap-3 text-xs text-[#902020]">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadMapData}
            className="btn-ghost text-[11px] px-2.5 py-1 rounded-md font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[560px] rounded-xl overflow-hidden border border-[#e5e1da] shadow-3xs">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#faf8f5]">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 rounded-full border-[2px] animate-spin"
                style={{ borderColor: "#c26d40", borderTopColor: "transparent" }}
              />
              <p className="text-xs text-[#8c8e96] font-medium">
                Plotting coordinates & corridors…
              </p>
            </div>
          </div>
        ) : (
          <>
            <FarmLinkMap
              key={mapKey}
              shops={shops}
              orders={orders}
              tripBlocks={tripBlocks}
              filters={filters}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              className="w-full h-full"
            />

            {/* Floating Legend */}
            <MapLegend />

            {/* Floating Inspector Drawer */}
            {selectedEntity && (
              <div className="absolute top-4 right-4 z-[500] max-h-[92%] overflow-y-auto">
                <MapInspector
                  selectedEntity={selectedEntity}
                  onClose={() => setSelectedEntity(null)}
                  onCenter={() => setMapKey((k) => k + 1)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
