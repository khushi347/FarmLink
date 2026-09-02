"use client";

import React from "react";
import { MapFilterState, MapLayerFilter } from "@/types/map";
import {
  StoreIcon,
  ShoppingBagIcon,
  TripBlockIcon,
  CrosshairIcon,
} from "@/components/Icons";

interface MapControlsProps {
  filters: MapFilterState;
  onChangeFilters: (filters: MapFilterState) => void;
  onResetView: () => void;
  serviceCategories: string[];
}

const LAYER_OPTIONS: { id: MapLayerFilter; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "all", label: "All Layers", Icon: CrosshairIcon },
  { id: "shops", label: "Retail Shops", Icon: StoreIcon },
  { id: "orders", label: "Farmer Orders", Icon: ShoppingBagIcon },
  { id: "tripblocks", label: "TripBlocks", Icon: TripBlockIcon },
];

export default function MapControls({
  filters,
  onChangeFilters,
  onResetView,
  serviceCategories,
}: MapControlsProps) {
  const handleLayerChange = (layer: MapLayerFilter) => {
    onChangeFilters({ ...filters, layer });
  };

  const handleServiceChange = (serviceType: string) => {
    onChangeFilters({ ...filters, serviceType });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ ...filters, searchQuery: e.target.value });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#e5e1da] shadow-3xs">
      {/* Left — Layer toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8e96] mr-1">
          Layers:
        </span>
        <div className="pill-group">
          {LAYER_OPTIONS.map(({ id, label, Icon }) => {
            const active = filters.layer === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleLayerChange(id)}
                className={`pill-item flex items-center gap-1.5 ${active ? "active" : ""}`}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle & Right — Category filter, search, reset view */}
      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
        {/* Category dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="map-service-select" className="text-[10px] font-semibold text-[#8c8e96]">
            Service:
          </label>
          <select
            id="map-service-select"
            value={filters.serviceType}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="warm-input h-8 px-2.5 py-0 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">All Categories</option>
            {serviceCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search hub, village, code…"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="warm-input h-8 pl-7 pr-3 rounded-lg text-xs w-48"
          />
          <svg
            className="absolute left-2 top-2 h-4 w-4 pointer-events-none text-[#8c8e96]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>

        {/* Re-center button */}
        <button
          type="button"
          onClick={onResetView}
          className="btn-ghost h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          title="Fit all markers in view"
        >
          <CrosshairIcon size={13} />
          <span>Fit View</span>
        </button>
      </div>
    </div>
  );
}
