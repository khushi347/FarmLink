"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapShop,
  MapOrder,
  MapTripBlock,
  SelectedMapEntity,
  MapFilterState,
  LatLngTuple,
} from "@/types/map";

interface FarmLinkMapProps {
  shops: MapShop[];
  orders: MapOrder[];
  tripBlocks: MapTripBlock[];
  filters: MapFilterState;
  selectedEntity: SelectedMapEntity;
  onSelectEntity: (entity: SelectedMapEntity) => void;
  className?: string;
}

export default function FarmLinkMap({
  shops,
  orders,
  tripBlocks,
  filters,
  selectedEntity,
  onSelectEntity,
  className = "",
}: FarmLinkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on Central / Northern India agricultural corridor
    const defaultCenter: LatLngTuple = [23.26, 77.41];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap Standard Tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // 2. Render Markers and Corridors when data or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const allBounds: LatLngTuple[] = [];

    // Filter Logic
    const showShops = filters.layer === "all" || filters.layer === "shops";
    const showOrders = filters.layer === "all" || filters.layer === "orders";
    const showTripBlocks = filters.layer === "all" || filters.layer === "tripblocks";

    const matchesService = (itemType?: string | string[]) => {
      if (filters.serviceType === "ALL") return true;
      if (Array.isArray(itemType)) {
        return itemType.some((t) => t.toLowerCase() === filters.serviceType.toLowerCase());
      }
      return itemType?.toLowerCase() === filters.serviceType.toLowerCase();
    };

    const matchesSearch = (text: string) => {
      if (!filters.searchQuery) return true;
      return text.toLowerCase().includes(filters.searchQuery.toLowerCase());
    };

    // A. Render Shops
    if (showShops) {
      shops.forEach((shop) => {
        if (!matchesService(shop.category)) return;
        if (!matchesSearch(`${shop.name} ${shop.village} ${shop.phone}`)) return;

        const [lat, lng] = shop.coordinates;
        allBounds.push([lat, lng]);

        const isSelected =
          selectedEntity?.type === "shop" && selectedEntity.data.id === shop.id;

        const shopIcon = L.divIcon({
          className: "farmlink-marker-shop",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20],
          html: `
            ${isSelected ? '<div class="farmlink-marker-pulse"></div>' : ""}
            <div class="marker-inner" style="${isSelected ? "transform: scale(1.2); border-color: #1c1e24;" : ""}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                <path d="M2 7h20v5H2z" />
              </svg>
            </div>
          `,
        });

        const marker = L.marker([lat, lng], { icon: shopIcon });

        const popupContent = document.createElement("div");
        popupContent.style.padding = "12px 14px";
        popupContent.style.minWidth = "180px";
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 9px; font-weight: 800; background: #fff4ec; color: #b84a0a; border: 1px solid #f5c4a0; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">Retail Shop</span>
          </div>
          <p style="font-size: 13px; font-weight: 700; color: #1c1e24; margin: 0 0 2px 0;">${shop.name}</p>
          <p style="font-size: 11px; color: #5a5f6b; margin: 0 0 6px 0;">📍 ${shop.village}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px;">
            ${shop.category
              .map(
                (c) =>
                  `<span style="font-size: 9px; font-weight: 600; background: #faf8f5; color: #5a5f6b; border: 1px solid #e5e1da; padding: 1px 4px; border-radius: 3px;">${c}</span>`
              )
              .join("")}
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          onSelectEntity({ type: "shop", data: shop });
        });

        layerGroup.addLayer(marker);
      });
    }

    // B. Render Orders
    if (showOrders) {
      orders.forEach((order) => {
        if (!matchesService(order.serviceType)) return;
        if (filters.status !== "ALL" && order.status !== filters.status) return;
        if (!matchesSearch(`${order.code} ${order.farmer?.name || ""} ${order.serviceType}`)) return;

        const [lat, lng] = order.coordinates;
        allBounds.push([lat, lng]);

        const isGrouped = order.status === "Grouped";
        const isSelected =
          selectedEntity?.type === "order" && selectedEntity.data.id === order.id;

        const orderIcon = L.divIcon({
          className: `farmlink-marker-order ${isGrouped ? "grouped" : ""}`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
          html: `
            ${isSelected ? '<div class="farmlink-marker-pulse"></div>' : ""}
            <div class="marker-inner" style="${isSelected ? "transform: scale(1.25); border-color: #1c1e24;" : ""}">
              ${isGrouped ? "G" : "P"}
            </div>
          `,
        });

        const marker = L.marker([lat, lng], { icon: orderIcon });

        const popupContent = document.createElement("div");
        popupContent.style.padding = "12px 14px";
        popupContent.style.minWidth = "180px";
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 800; color: #1c1e24;">${order.code}</span>
            <span style="font-size: 9px; font-weight: 700; background: ${
              isGrouped ? "#f4f1eb" : "#fff8f2"
            }; color: ${isGrouped ? "#426890" : "#a0510a"}; border: 1px solid ${
          isGrouped ? "#dce8f3" : "#f5d5b8"
        }; padding: 1px 5px; border-radius: 4px;">${order.status}</span>
          </div>
          <p style="font-size: 12px; font-weight: 600; color: #1c1e24; margin: 0 0 2px 0;">${order.serviceType}</p>
          <p style="font-size: 11px; color: #8c8e96; margin: 0 0 4px 0;">Farmer: ${
            order.farmer?.name || "Local Farmer"
          }</p>
          ${
            order.products && order.products.length > 0
              ? `<p style="font-size: 10px; color: #5a5f6b; margin: 0;">Items: ${order.products
                  .map((p) => `${p.quantity} ${p.unit || "units"} ${p.name}`)
                  .join(", ")}</p>`
              : ""
          }
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          onSelectEntity({ type: "order", data: order });
        });

        layerGroup.addLayer(marker);
      });
    }

    // C. Render TripBlocks & Corridors
    if (showTripBlocks) {
      tripBlocks.forEach((tb) => {
        if (!matchesService(tb.serviceType)) return;
        if (filters.status !== "ALL" && tb.status !== filters.status) return;
        if (!matchesSearch(`${tb.code} ${tb.serviceType} ${tb.status}`)) return;

        const [cLat, cLng] = tb.centerCoordinates;
        allBounds.push([cLat, cLng]);

        const isSelected =
          selectedEntity?.type === "tripblock" && selectedEntity.data.id === tb.id;

        // Draw corridor lines connecting order harvest origins to aggregation center
        if (tb.corridor?.originPoints && tb.corridor.originPoints.length > 0) {
          tb.corridor.originPoints.forEach((origin) => {
            const polyline = L.polyline([origin, [cLat, cLng]], {
              color: isSelected ? "#c26d40" : "#426890",
              weight: isSelected ? 3 : 2,
              opacity: 0.65,
              dashArray: "4, 6",
            });
            layerGroup.addLayer(polyline);
          });
        }

        // Draw delivery line to destination shop if assigned
        if (tb.corridor?.destinationPoint) {
          const destLine = L.polyline([[cLat, cLng], tb.corridor.destinationPoint], {
            color: "#1f6e48",
            weight: 3,
            opacity: 0.85,
          });
          layerGroup.addLayer(destLine);
        }

        // Center Location Marker
        const tripIcon = L.divIcon({
          className: "farmlink-marker-trip",
          iconSize: [80, 26],
          iconAnchor: [40, 13],
          popupAnchor: [0, -16],
          html: `
            <div class="marker-inner" style="${isSelected ? "border-color: #ffffff; background: #c26d40;" : ""}">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #5fbc82;"></span>
              <span>${tb.code}</span>
              <span style="opacity: 0.75; font-size: 9px;">(${tb.orderCount})</span>
            </div>
          `,
        });

        const marker = L.marker([cLat, cLng], { icon: tripIcon });

        const popupContent = document.createElement("div");
        popupContent.style.padding = "12px 14px";
        popupContent.style.minWidth = "190px";
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: #1c1e24;">${tb.code}</span>
            <span style="font-size: 9px; font-weight: 700; background: #fff4ec; color: #b84a0a; border: 1px solid #f5c4a0; padding: 1px 5px; border-radius: 4px;">${tb.status}</span>
          </div>
          <p style="font-size: 12px; font-weight: 600; color: #1c1e24; margin: 0 0 2px 0;">${tb.serviceType}</p>
          <p style="font-size: 11px; color: #5a5f6b; margin: 0 0 4px 0;">Aggregation Center · ${tb.orderCount} Orders</p>
          ${
            tb.assignedShop
              ? `<p style="font-size: 10px; color: #1f6e48; font-weight: 600; margin: 0;">Dest: ${tb.assignedShop.name} (${tb.assignedShop.village})</p>`
              : '<p style="font-size: 10px; color: #b84a0a; font-weight: 600; margin: 0;">Open for Retail Shop Claim</p>'
          }
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          onSelectEntity({ type: "tripblock", data: tb });
        });

        layerGroup.addLayer(marker);
      });
    }

    // Auto-fit bounds if we have points and no specific entity selected
    if (allBounds.length > 0 && !selectedEntity) {
      try {
        const bounds = L.latLngBounds(allBounds);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        console.error("Failed to fit map bounds", e);
      }
    }
  }, [shops, orders, tripBlocks, filters, selectedEntity, onSelectEntity]);

  // 3. Smooth Pan / Fly to selected entity
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedEntity) return;

    let targetCoords: LatLngTuple | null = null;
    if (selectedEntity.type === "shop") {
      targetCoords = selectedEntity.data.coordinates;
    } else if (selectedEntity.type === "order") {
      targetCoords = selectedEntity.data.coordinates;
    } else if (selectedEntity.type === "tripblock") {
      targetCoords = selectedEntity.data.centerCoordinates;
    }

    if (targetCoords) {
      map.flyTo(targetCoords, 14, { duration: 0.8 });
    }
  }, [selectedEntity]);

  return (
    <div className={`farmlink-map-container ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
