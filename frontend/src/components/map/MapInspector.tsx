"use client";

import React from "react";
import { SelectedMapEntity } from "@/types/map";
import { Cormorant_Garamond } from "next/font/google";
import {
  XIcon,
  StoreIcon,
  ShoppingBagIcon,
  TripBlockIcon,
  CrosshairIcon,
  WhatsAppIcon,
  CheckIcon,
} from "@/components/Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

interface MapInspectorProps {
  selectedEntity: SelectedMapEntity;
  onClose: () => void;
  onCenter: () => void;
}

export default function MapInspector({
  selectedEntity,
  onClose,
  onCenter,
}: MapInspectorProps) {
  if (!selectedEntity) return null;

  return (
    <div
      className="warm-card card-enter p-5 space-y-4 max-w-sm w-full bg-white/95 backdrop-blur-md shadow-xl border border-[#e5e1da] overflow-hidden"
      style={{ animationDuration: "0.2s" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#f0ece6] pb-3">
        <div className="flex items-center gap-2.5">
          {selectedEntity.type === "shop" && (
            <div className="h-8 w-8 rounded-lg bg-[#fff4ec] border border-[#f5c4a0] flex items-center justify-center text-[#b84a0a]">
              <StoreIcon size={16} />
            </div>
          )}
          {selectedEntity.type === "order" && (
            <div className="h-8 w-8 rounded-lg bg-[#fff8f2] border border-[#f5d5b8] flex items-center justify-center text-[#a0510a]">
              <ShoppingBagIcon size={16} />
            </div>
          )}
          {selectedEntity.type === "tripblock" && (
            <div className="h-8 w-8 rounded-lg bg-[#1c1e24] border border-[#c26d40] flex items-center justify-center text-[#ffffff]">
              <TripBlockIcon size={16} />
            </div>
          )}

          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#8c8e96] block">
              {selectedEntity.type === "shop"
                ? "Retail Partner Shop"
                : selectedEntity.type === "order"
                ? "Farmer WhatsApp Order"
                : "TripBlock Aggregation"}
            </span>
            <h3 className={`${cormorant.className} text-lg font-bold text-[#1c1e24] leading-tight`}>
              {selectedEntity.type === "shop"
                ? selectedEntity.data.name
                : selectedEntity.type === "order"
                ? selectedEntity.data.code
                : selectedEntity.data.code}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCenter}
            className="p-1 rounded-md text-[#8c8e96] hover:text-[#1c1e24] hover:bg-[#faf8f5] transition-colors"
            title="Center map on entity"
            aria-label="Center map on entity"
          >
            <CrosshairIcon size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#8c8e96] hover:text-[#1c1e24] hover:bg-[#faf8f5] transition-colors"
            title="Close inspector"
            aria-label="Close inspector"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Body for Shop */}
      {selectedEntity.type === "shop" && (
        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
              Hub / Village Location
            </span>
            <p className="font-semibold text-[#1c1e24]">📍 {selectedEntity.data.village}</p>
            <p className="text-[10px] font-mono text-[#8c8e96] mt-0.5">
              Lat: {selectedEntity.data.coordinates[0].toFixed(4)}, Lng:{" "}
              {selectedEntity.data.coordinates[1].toFixed(4)}
            </p>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
              Contact & Phone
            </span>
            <p className="font-medium text-[#5a5f6b]">{selectedEntity.data.phone}</p>
            {selectedEntity.data.owner && (
              <p className="text-[11px] text-[#8c8e96]">Owner: {selectedEntity.data.owner.name}</p>
            )}
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-1">
              Supported Categories
            </span>
            <div className="flex flex-wrap gap-1">
              {selectedEntity.data.category.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#faf8f5] border border-[#e5e1da] text-[#5a5f6b]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body for Order */}
      {selectedEntity.type === "order" && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96]">
              Service Type
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fff8f2] text-[#a0510a] border border-[#f5d5b8]">
              {selectedEntity.data.serviceType}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96]">
              Status
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedEntity.data.status === "Grouped"
                  ? "bg-[#edf4fb] text-[#234e72] border border-[#a8c8e8]"
                  : "bg-[#fff8f2] text-[#a0510a] border border-[#f5d5b8]"
              }`}
            >
              {selectedEntity.data.status}
            </span>
          </div>

          {selectedEntity.data.farmer && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
                Farmer Contact
              </span>
              <p className="font-semibold text-[#1c1e24]">
                {selectedEntity.data.farmer.name || "Local Farmer"} ({selectedEntity.data.farmer.phone})
              </p>
            </div>
          )}

          {selectedEntity.data.products && selectedEntity.data.products.length > 0 && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-1">
                Requested Products
              </span>
              <div className="space-y-1 bg-[#faf8f5] p-2.5 rounded-lg border border-[#e5e1da]">
                {selectedEntity.data.products.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-[#1c1e24]">{p.name}</span>
                    <span className="font-bold text-[#c26d40]">
                      {p.quantity} {p.unit || "units"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEntity.data.transcript && (
            <div className="bg-[#f0fdf0] p-2.5 rounded-lg border border-[#c8eacc] text-[11px] text-[#1c3a1c] italic flex items-start gap-2">
              <WhatsAppIcon size={12} className="text-[#25D366] shrink-0 mt-0.5" />
              <span>"{selectedEntity.data.transcript}"</span>
            </div>
          )}

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
              Geographic Coordinates
            </span>
            <p className="text-[10px] font-mono text-[#8c8e96]">
              Lat: {selectedEntity.data.coordinates[0].toFixed(5)}, Lng:{" "}
              {selectedEntity.data.coordinates[1].toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* Body for TripBlock */}
      {selectedEntity.type === "tripblock" && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96]">
              Status
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fff4ec] text-[#b84a0a] border border-[#f5c4a0]">
              {selectedEntity.data.status}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
              Service & Orders
            </span>
            <p className="font-semibold text-[#1c1e24]">{selectedEntity.data.serviceType}</p>
            <p className="text-[11px] text-[#5a5f6b]">
              {selectedEntity.data.orderCount} Orders Grouped · {selectedEntity.data.totalQuantity} total units
            </p>
          </div>

          {selectedEntity.data.assignedShop ? (
            <div className="bg-[#eef7f2] p-2.5 rounded-lg border border-[#a8d8bc]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#1f6e48] block mb-0.5">
                Claimed Retail Partner
              </span>
              <p className="font-bold text-[#1f6e48]">{selectedEntity.data.assignedShop.name}</p>
              <p className="text-[10px] text-[#1f6e48]">📍 {selectedEntity.data.assignedShop.village}</p>
            </div>
          ) : (
            <div className="bg-[#fff4ec] p-2.5 rounded-lg border border-[#f5c4a0] text-[11px] text-[#b84a0a] font-semibold">
              Open for Nearby Retail Shop Claim
            </div>
          )}

          {selectedEntity.data.orders && selectedEntity.data.orders.length > 0 && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-1">
                Grouped Orders in Corridor
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {selectedEntity.data.orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-center p-1.5 rounded bg-[#faf8f5] border border-[#e5e1da] text-[10px]"
                  >
                    <span className="font-mono font-bold text-[#1c1e24]">{o.code}</span>
                    <span className="text-[#5a5f6b]">
                      {o.products?.map((p) => `${p.quantity} ${p.name}`).join(", ") || o.serviceType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-0.5">
              Aggregation Center
            </span>
            <p className="text-[10px] font-mono text-[#8c8e96]">
              Lat: {selectedEntity.data.centerCoordinates[0].toFixed(5)}, Lng:{" "}
              {selectedEntity.data.centerCoordinates[1].toFixed(5)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
