import React from "react";
import PlaceholderSection from "./PlaceholderSection";
import {
  DashboardIcon,
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  DollarSignIcon,
  BrainIcon,
} from "./Icons";

// --- ADMIN SECTIONS ---

export function AdminOverviewSection() {
  return (
    <PlaceholderSection
      title="Cooperative Workflow Board"
      subtitle="Today's WhatsApp intakes, TripBlocks, and shop claims"
      description="Welcome to your daily workflow workspace. Track fresh crop intakes from WhatsApp, group incoming orders into regional TripBlocks, and manage shop claims. FarmLink keeps rural fields and local markets connected."
      role="admin"
      backendEndpoints={["/api/group", "/api/orders", "/api/webhooks"]}
      mockDataLayout="metrics"
      icon={<DashboardIcon size={24} />}
    />
  );
}

export function AdminShopkeepersSection() {
  return (
    <PlaceholderSection
      title="Local Retailer Directory"
      subtitle="Supporting and verifying our local cooperative shop partners"
      description="A directory of local shops participating in the cooperative. Here you can add new retail partners, verify coordinates for delivery routing, and log shop claims."
      role="admin"
      backendEndpoints={["POST /api/admin/shopkeepers"]}
      mockDataLayout="table"
      icon={<UsersIcon size={24} />}
    />
  );
}

export function AdminLogisticsSection() {
  return (
    <PlaceholderSection
      title="TripBlock Queue & Schedule"
      subtitle="Aggregate crop harvests into regional TripBlocks available for shop claims"
      description="Group neighboring crop orders into shared TripBlocks to streamline logistics and maximize load efficiency across local shop networks."
      role="admin"
      backendEndpoints={["GET /api/trip-blocks", "POST /api/trip-blocks/:tripId/claim"]}
      mockDataLayout="trips"
      icon={<TruckIcon size={24} />}
    />
  );
}

export function AdminOrdersSection() {
  return (
    <PlaceholderSection
      title="Cooperative Logbook"
      subtitle="Record of crop orders, payments, and delivery completions"
      description="A log of all crop orders, WhatsApp intakes, and retail delivery receipts processed through the cooperative network."
      role="admin"
      backendEndpoints={["GET /api/orders"]}
      mockDataLayout="table"
      icon={<ShoppingBagIcon size={24} />}
    />
  );
}

export function AdminAIInsightsSection() {
  return (
    <PlaceholderSection
      title="AI Harvest Assistant"
      subtitle="Translating farmer WhatsApp messages into organized orders"
      description="This assistant helps parse incoming WhatsApp messages from farmers (such as 'I have 250kg tomatoes ready in Sonipat'). It automatically extracts crop, weight, and location into structured orders for grouping."
      role="admin"
      backendEndpoints={["POST /api/ai", "/api/ai/insights"]}
      mockDataLayout="analytics"
      icon={<BrainIcon size={24} />}
    />
  );
}

// --- SHOPKEEPER SECTIONS ---

export function ShopkeeperOverviewSection() {
  return (
    <PlaceholderSection
      title="Store Workspace"
      subtitle="Check your incoming TripBlocks and shop claim status"
      description="Your daily hub workspace. Check when your claimed TripBlocks are arriving and review shop order receipts."
      role="shopkeeper"
      backendEndpoints={["GET /api/shop/dashboard", "GET /api/shop/revenue"]}
      mockDataLayout="metrics"
      icon={<DashboardIcon size={24} />}
    />
  );
}

export function ShopkeeperOrdersSection() {
  return (
    <PlaceholderSection
      title="Fresh Crop Orders"
      subtitle="Request fresh harvests directly from local regional farms"
      description="Order fresh potatoes, onions, tomatoes, and other crops directly from regional farmers."
      role="shopkeeper"
      backendEndpoints={["GET /api/shop/orders", "POST /api/orders"]}
      mockDataLayout="table"
      icon={<ShoppingBagIcon size={24} />}
    />
  );
}

export function ShopkeeperTripsSection() {
  return (
    <PlaceholderSection
      title="TripBlock Claims"
      subtitle="Track your active shop claims and expected delivery schedules"
      description="View details for your claimed TripBlocks, including crop compositions and real-time delivery status updates."
      role="shopkeeper"
      backendEndpoints={[
        "GET /api/shop/trips/available",
        "GET /api/shop/trips/accepted",
        "GET /api/shop/trips/completed",
      ]}
      mockDataLayout="trips"
      icon={<TruckIcon size={24} />}
    />
  );
}

export function ShopkeeperRevenueSection() {
  return (
    <PlaceholderSection
      title="Payments & Savings Log"
      subtitle="Ledger of your store's sales and cooperative savings"
      description="A transparent log of store payouts, transport contributions, and savings generated through direct cooperative buying."
      role="shopkeeper"
      backendEndpoints={["GET /api/shop/revenue"]}
      mockDataLayout="metrics"
      icon={<DollarSignIcon size={24} />}
    />
  );
}
