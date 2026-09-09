"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  mapApi,
  tripApi,
  adminApi,
  AdminDashboardMetrics,
  AdminCustomer,
  AdminShopkeeper,
  AdminShop,
  AdminProductsData,
  AdminOrderDetails,
  AdminTripDetails,
} from "@/lib/api";
import { MapDataResponse, MapOrder, MapTripBlock } from "@/types/map";
import { useRealtime } from "@/hooks/useRealtime";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  WhatsAppIcon,
  SparklesIcon,
  PackageIcon,
  TripBlockIcon,
  StoreIcon,
  TruckIcon,
  BrainIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckIcon,
  MapPinIcon,
  UsersIcon,
  EyeIcon,
  XIcon,
} from "@/components/Icons";
import MapView from "@/components/map/MapView";
import SettingsSection from "@/components/SettingsSection";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/* ────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────── */
type WorkflowStatus =
  | "NEW" | "AI PARSED" | "NEEDS REVIEW" | "READY FOR GROUPING"
  | "GROUPED" | "ASSIGNED TO TRIPBLOCK" | "AVAILABLE TO SHOPS"
  | "CLAIMED" | "LOCKED" | "IN DELIVERY" | "COMPLETED";

type RequestCategory =
  | "Tractor Service" | "Seeds & Fertilizer" | "Agricultural Supplies"
  | "Groceries" | "Produce" | "Pesticides" | "Grocery Supplies";

interface ActivityItem {
  id: string; itemRef: string; source: string;
  category: RequestCategory; status: WorkflowStatus;
  updated: string; actionText: string;
}
interface WhatsAppIntake {
  id: string; sender: string; phone: string; rawMessage: string;
  category: RequestCategory; aiStatus: WorkflowStatus; aiConfidence: number; timestamp: string;
  parsed: { item: string; qty: string; location: string; timing: string };
}
interface OrderRecord {
  id: string; code: string; customer: string; category: RequestCategory;
  location: string; itemDetails: string; status: WorkflowStatus;
  created: string; quantity: string;
}
interface TripBlockRecord {
  id: string; code: string; orderCount: number; categoryItems: string;
  corridor: string; weightQuantity: string; claimStatus: WorkflowStatus;
  claimedByShop?: string; deadlineMinutes?: number; orders: string[];
}

/* ────────────────────────────────────────────────────
   STATUS BADGE
──────────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "NEW":                  { bg: "#fff8f2", text: "#a0510a", border: "#f5d5b8" },
  "AI PARSED":            { bg: "#f2f4ff", text: "#3a4fa0", border: "#c8d0f5" },
  "NEEDS REVIEW":         { bg: "#fefae8", text: "#7a5d00", border: "#edd97a" },
  "READY FOR GROUPING":   { bg: "#fdf5e8", text: "#8a5a00", border: "#f5cc7a" },
  "GROUPED":              { bg: "#f6f6f6", text: "#4a4f5a", border: "#d8d8d8" },
  "ASSIGNED TO TRIPBLOCK":{ bg: "#f6f6f6", text: "#4a4f5a", border: "#d8d8d8" },
  "AVAILABLE TO SHOPS":   { bg: "#fff4ec", text: "#b84a0a", border: "#f5c4a0" },
  "CLAIMED":              { bg: "#eef7f2", text: "#1f6e48", border: "#a8d8bc" },
  "LOCKED":               { bg: "#eef7f2", text: "#1f6e48", border: "#a8d8bc" },
  "IN DELIVERY":          { bg: "#edf4fb", text: "#234e72", border: "#a8c8e8" },
  "COMPLETED":            { bg: "#eef7f2", text: "#1a5e3a", border: "#96ccb0" },
  "NEW INGESTION":        { bg: "#f2f4ff", text: "#3a4fa0", border: "#c8d0f5" },
};

const LIVE_STATUSES = new Set(["NEW", "IN DELIVERY", "AVAILABLE TO SHOPS"]);

function orderWorkflowStatus(status?: string): WorkflowStatus {
  if (status === "RECEIVED" || status === "Pending") return "READY FOR GROUPING";
  if (status === "GROUPED" || status === "Grouped") return "ASSIGNED TO TRIPBLOCK";
  if (status === "CLAIMED" || status === "Accepted") return "IN DELIVERY";
  if (status === "COMPLETED" || status === "Completed") return "COMPLETED";
  return "NEEDS REVIEW";
}

function tripWorkflowStatus(status: MapTripBlock["status"]): WorkflowStatus {
  if (status === "CREATED" || status === "OPEN" || status === "Pending") return "AVAILABLE TO SHOPS";
  if (status === "CLAIMED" || status === "LOCKED") return "CLAIMED";
  if (status === "IN DELIVERY") return "IN DELIVERY";
  return "COMPLETED";
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const s = STATUS_STYLE[status] ?? { bg: "#f6f6f6", text: "#5a5f6b", border: "#d8d8d8" };
  const label = status === "ASSIGNED TO TRIPBLOCK" ? "IN TRIPBLOCK" : status;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${LIVE_STATUSES.has(status) ? "live-dot" : ""}`}
        style={{ background: s.text }}
      />
      {label}
    </span>
  );
}

/* ────────────────────────────────────────────────────
   CATEGORY TAG
──────────────────────────────────────────────────── */
const CAT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "Tractor Service":       { bg: "#fff8f2", text: "#a05010", border: "#f5d0a0" },
  "Seeds & Fertilizer":    { bg: "#f4faf0", text: "#3a7030", border: "#b0d8a0" },
  "Agricultural Supplies": { bg: "#f2fbf8", text: "#1a6e58", border: "#90d0c0" },
  "Pesticides":            { bg: "#fff5f5", text: "#902020", border: "#f0b0b0" },
  "Groceries":             { bg: "#edf4fb", text: "#234e72", border: "#a8c8e8" },
  "Grocery Supplies":      { bg: "#edf4fb", text: "#234e72", border: "#a8c8e8" },
  "Produce":               { bg: "#f4fdf0", text: "#2a6a1a", border: "#a0d890" },
};

function CategoryTag({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? { bg: "#f4f1eb", text: "#5a5f6b", border: "#d6d1c7" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {cat}
    </span>
  );
}

/* ────────────────────────────────────────────────────
   ANIMATED METRIC NUMBER
──────────────────────────────────────────────────── */
function AnimMetric({ value }: { value: string }) {
  const num = parseInt(value.replace(/,/g, ""), 10);
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (isNaN(num)) { setDisplay(value); return; }
    const dur = 700, start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * num).toLocaleString());
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, num]);
  return <>{display}</>;
}

/* ────────────────────────────────────────────────────
   SECTION HEADING — matches login page typographic style
──────────────────────────────────────────────────── */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className={`${cormorant.className} text-2xl font-medium tracking-wide`} style={{ color: "#1c1e24" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs mt-1 font-light leading-relaxed" style={{ color: "#8c8e96" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────
   DIVIDER
──────────────────────────────────────────────────── */
function Divider() {
  return <div className="border-t" style={{ borderColor: "#e5e1da" }} />;
}

/* ────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────── */
export default function Home() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const { status: realtimeStatus, subscribe } = useRealtime();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "shopkeeper") {
        router.push("/shopkeeper");
      }
    }
  }, [isLoading, user, router]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actFilter, setActFilter] = useState("ALL");
  const [dashboardData, setDashboardData] = useState<MapDataResponse["data"] | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [adminCustomers, setAdminCustomers] = useState<AdminCustomer[]>([]);
  const [adminShopkeepers, setAdminShopkeepers] = useState<AdminShopkeeper[]>([]);
  const [adminShops, setAdminShops] = useState<AdminShop[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProductsData | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [togglingShopId, setTogglingShopId] = useState<string | null>(null);

  // Modal inspection states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<AdminOrderDetails | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripDetails, setTripDetails] = useState<AdminTripDetails | null>(null);
  const [loadingTripDetails, setLoadingTripDetails] = useState(false);

  const [dataError, setDataError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab") || "overview";
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    const h = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") || "overview";
      setActiveTab(tab);
    };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      setDataError(null);
      const [mapRes, adminRes] = await Promise.all([
        mapApi.getMapData(undefined, token),
        adminApi.getDashboard(token),
      ]);
      if (!mapRes.success) throw new Error(mapRes.message || "Unable to load map data");
      setDashboardData(mapRes.data);
      if (adminRes.success) {
        setAdminMetrics(adminRes.data);
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to load dashboard data");
    }
  }, [token]);

  const loadTabData = useCallback(async () => {
    if (!token) return;
    try {
      if (activeTab === "customers") {
        const res = await adminApi.getCustomers({ page: customerPage, limit: 15, search: customerSearch || undefined }, token);
        if (res.success) {
          setAdminCustomers(res.data);
          setCustomerTotalPages(res.totalPages || 1);
        }
      } else if (activeTab === "shopkeepers") {
        const res = await adminApi.getShopkeepers(token);
        if (res.success) setAdminShopkeepers(res.data);
      } else if (activeTab === "shops") {
        const res = await adminApi.getShops(token);
        if (res.success) setAdminShops(res.data);
      } else if (activeTab === "products") {
        const res = await adminApi.getProducts(token);
        if (res.success) setAdminProducts(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load tab data:", err);
    }
  }, [token, activeTab, customerPage, customerSearch]);

  const handleToggleShopStatus = async (shopId: string) => {
    if (!token || togglingShopId) return;
    try {
      setTogglingShopId(shopId);
      const res = await adminApi.toggleShopStatus(shopId, token);
      if (res.success) {
        setAdminShops((prev) =>
          prev.map((s) => (s._id === shopId ? { ...s, isActive: res.shop.isActive } : s))
        );
        await loadDashboardData();
      }
    } catch (err: any) {
      setDataError(err?.message || "Failed to update shop status");
    } finally {
      setTogglingShopId(null);
    }
  };

  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingOrderDetails(true);
    setOrderDetails(null);
    try {
      const res = await adminApi.getOrderDetails(orderId, token || undefined);
      if (res.success) setOrderDetails(res.data);
    } catch (err: any) {
      setDataError(err?.message || "Failed to load order details");
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const openTripDetails = async (tripId: string) => {
    setSelectedTripId(tripId);
    setLoadingTripDetails(true);
    setTripDetails(null);
    try {
      const res = await adminApi.getTripDetails(tripId, token || undefined);
      if (res.success) setTripDetails(res.data);
    } catch (err: any) {
      setDataError(err?.message || "Failed to load trip details");
    } finally {
      setLoadingTripDetails(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadDashboardData();
        refreshTimerRef.current = null;
      }, 250);
    };
    const cleanups = [
      subscribe("new_order", scheduleRefresh),
      subscribe("trip_created", scheduleRefresh),
      subscribe("trip_claimed", scheduleRefresh),
      subscribe("trip_completed", scheduleRefresh),
    ];
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [loadDashboardData, subscribe]);

  useEffect(() => {
    if (realtimeStatus === "connected") loadDashboardData();
  }, [realtimeStatus, loadDashboardData]);

  const goTo = useCallback((tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  }, []);

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${jakarta.className}`} style={{ background: "#faf8f5" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-[2px] animate-spin" style={{ borderColor: "#c26d40", borderTopColor: "transparent" }} />
          <p className={`${cormorant.className} text-lg italic font-light`} style={{ color: "#8c8e96" }}>
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  /* ── DATA ── */
  const sourceOrders = dashboardData?.orders || [];
  const sourceTrips = dashboardData?.tripBlocks || [];
  const orders: OrderRecord[] = sourceOrders.map((order) => ({
    id: order.id,
    code: order.code,
    customer: order.farmer?.name || "Local Farmer",
    category: order.serviceType as RequestCategory,
    location: order.coordinates.join(", "),
    itemDetails: order.products.map((product) => `${product.quantity} ${product.unit || "units"} ${product.name}`).join(", "),
    status: orderWorkflowStatus(order.status),
    created: order.requestedDate ? new Date(order.requestedDate).toLocaleString() : "",
    quantity: order.products.map((product) => `${product.quantity} ${product.unit || "units"}`).join(", "),
  }));
  const tripblocks: TripBlockRecord[] = sourceTrips.map((trip) => ({
    id: trip.id,
    code: trip.code,
    orderCount: trip.orderCount,
    categoryItems: trip.serviceType,
    corridor: `${trip.orderCount} origin points`,
    weightQuantity: `${trip.totalQuantity}`,
    claimStatus: tripWorkflowStatus(trip.status),
    claimedByShop: trip.assignedShop?.name,
    orders: trip.orders.map((order) => order.code),
  }));
  const shopRows = (dashboardData?.shops || []).map((shop) => {
    const claims = sourceTrips.filter((trip) => trip.assignedShop?.id === shop.id);
    return {
      name: shop.name,
      location: shop.village,
      claims: claims.map((trip) => trip.code).join(", ") || "None",
      count: claims.length,
    };
  });
  const deliveryRows = sourceTrips
    .filter((trip) => trip.status === "CLAIMED")
    .map((trip) => ({
      code: trip.code,
      route: `${trip.orderCount} origin points -> ${trip.assignedShop?.name || "Unassigned"}`,
      items: `${trip.totalQuantity} total · ${trip.serviceType}`,
      progress: 65,
      eta: trip.scheduledDate ? new Date(trip.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--",
      steps: ["Grouped", "Shop Claimed", "In Transit", "Delivered"],
      status: tripWorkflowStatus(trip.status),
    }));
  const shopActivity = sourceTrips
    .filter((trip) => trip.assignedShop)
    .slice(0, 4)
    .map((trip) => ({
      shop: trip.assignedShop?.name || "Shop",
      action: `${trip.status === "COMPLETED" ? "Completed" : "Claimed"} ${trip.code}`,
      time: trip.scheduledDate ? new Date(trip.scheduledDate).toLocaleString() : "",
    }));
  const activityItems: ActivityItem[] = [
    ...sourceOrders.map((order) => ({
      id: `order-${order.id}`, itemRef: `Order #${order.code}`, source: order.farmer?.name || "Local Farmer",
      category: order.serviceType as RequestCategory, status: orderWorkflowStatus(order.status),
      updated: order.requestedDate ? new Date(order.requestedDate).toLocaleString() : "", actionText: "View",
    })),
    ...sourceTrips.map((trip) => ({
      id: `trip-${trip.id}`, itemRef: `TripBlock ${trip.code}`, source: trip.serviceType,
      category: trip.serviceType as RequestCategory, status: tripWorkflowStatus(trip.status),
      updated: trip.scheduledDate ? new Date(trip.scheduledDate).toLocaleString() : "", actionText: "View",
    })),
  ];
  const attention: { text: string; urgency: string }[] = [];

  const filteredActivity = activityItems.filter((a) => {
    if (actFilter === "WHATSAPP")  return a.itemRef.includes("WhatsApp");
    if (actFilter === "ORDERS")    return a.itemRef.includes("Order");
    if (actFilter === "TRIPBLOCKS")return a.itemRef.includes("TripBlock");
    return true;
  });

  const stats = dashboardData?.stats;
  const metrics = [
    { label: "Total Customers", val: String(adminMetrics?.totalCustomers ?? 0), sub: "Registered farmers", accent: "#c26d40", live: false },
    { label: "Active Shops", val: String(adminMetrics?.activeShops ?? 0), sub: "Operational retailers", accent: "#1f6e48", live: true },
    { label: "Orders Today", val: String(adminMetrics?.ordersToday ?? 0), sub: "Placed today", accent: "#b84a0a", live: true },
    { label: "Active Trips", val: String(adminMetrics?.activeTrips ?? 0), sub: "In progress (CLAIMED)", accent: "#234e72", live: true },
    { label: "Completed Deliveries", val: String(adminMetrics?.completedDeliveries ?? 0), sub: "Fulfilled trips", accent: "#3a7030", live: false },
  ];

  /* ── SHARED SURFACE STYLES ── */
  const surface = {
    background: "#ffffff",
    border: "1px solid #e5e1da",
    borderRadius: "12px",
  } as const;

  const raisedSurface = {
    background: "#faf8f5",
    border: "1px solid #e5e1da",
    borderRadius: "12px",
  } as const;

  const inputStyle: React.CSSProperties = {
    border: "1px solid #d6d1c7",
    background: "#ffffff",
    color: "#1c1e24",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    outline: "none",
  };

  return (
    <div className={`min-h-screen flex ${jakarta.className}`} style={{ background: "#faf8f5", color: "#1c1e24" }}>

      <Sidebar activeTab={activeTab} setActiveTab={goTo} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header activeTab={activeTab} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">

          {dataError && (
            <div className="mx-6 mt-4 rounded-lg border border-[#f0b0b0] bg-[#fff5f5] px-4 py-3 text-xs text-[#902020]">
              {dataError}
              <button type="button" onClick={loadDashboardData} className="ml-3 font-bold underline">Retry</button>
            </div>
          )}

          {/* ── PAGE HEADER (sticky sub-header strip) ── */}
          <div
            className="px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4"
            style={{ borderBottom: "1px solid #e5e1da" }}
          >
            <div>
              <h1 className={`${cormorant.className} text-[28px] font-medium tracking-wide leading-tight`} style={{ color: "#1c1e24" }}>
                Good morning, FarmLink
              </h1>
              <p className="text-xs font-light mt-0.5" style={{ color: "#8c8e96" }}>
                Operational hub pulse across incoming orders, TripBlocks, and deliveries.
              </p>
            </div>

            {/* Compact workflow pipeline */}
            <div className="hidden xl:flex items-center gap-2">
              {[
                { label:"Orders",     n:stats?.totalOrders || 0, color:"#8a5a00", bg:"#fdf5e8", border:"#f5cc7a" },
                { label:"TripBlocks", n:stats?.openTripBlocks || 0, color:"#b84a0a", bg:"#fff4ec", border:"#f5c4a0" },
                { label:"Claimed",    n:stats?.claimedTripBlocks || 0, color:"#1f6e48", bg:"#eef7f2", border:"#a8d8bc" },
                { label:"Completed",  n:stats?.completedTripBlocks || 0, color:"#234e72", bg:"#edf4fb", border:"#a8c8e8" },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                  >
                    <span>{s.label}</span>
                    <span className="font-extrabold">{s.n}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <svg className="h-3 w-3 shrink-0" style={{ color: "#d6d1c7" }} viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-7">

            {/* ── METRICS ROW ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className="warm-card count-enter p-4"
                  style={{ animationDelay: `${i * 50}ms`, borderLeft: `3px solid ${m.accent}` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[11px] font-semibold leading-snug" style={{ color: "#8c8e96" }}>
                      {m.label}
                    </p>
                    {m.live && <span className="h-1.5 w-1.5 rounded-full live-dot mt-0.5" style={{ background: m.accent }} />}
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums" style={{ color: "#1c1e24" }}>
                    <AnimMetric value={m.val} />
                  </p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: "#b0b3bc" }}>{m.sub}</p>
                </div>
              ))}
            </div>

            {/* ── ANALYTICS & SAVINGS (MODULE 18) ── */}
            {activeTab === "analytics" && (
              <div className="page-enter">
                <AnalyticsDashboard token={token || undefined} />
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="page-enter grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* MAIN — 8 cols */}
                <div className="lg:col-span-8 space-y-5">

                  {/* ATTENTION MODULE */}
                  <div className="card-enter" style={{ background: "#fffcf8", border: "1px solid #f5d5b8", borderRadius: "12px", padding: "20px" }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center"
                          style={{ background: "#fff0e5", border: "1px solid #f5c4a0" }}
                        >
                          <AlertTriangleIcon size={14} style={{ color: "#c26d40" }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: "#7a3a10" }}>Needs Coordinator Attention</h3>
                          <p className="text-[11px] font-light" style={{ color: "#c26d40" }}>{attention.length} items require action</p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: "#fff0e5", color: "#a0510a", border: "1px solid #f5d5b8" }}
                      >
                        {attention.length} Active
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attention.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg card-enter"
                          style={{
                            background: "#ffffff",
                            border: "1px solid #f0d8c0",
                            animationDelay: `${i * 50}ms`,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0 mt-1.5"
                            style={{ background: a.urgency === "high" ? "#c26d40" : "#d4a040" }}
                          />
                          <p className="text-xs font-medium flex-1 leading-snug" style={{ color: "#5a3a20" }}>
                            {a.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTIVITY TABLE */}
                  <div className="warm-card card-enter overflow-hidden" style={{ animationDelay: "80ms" }}>
                    {/* Table header */}
                    <div
                      className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                      style={{ borderBottom: "1px solid #e5e1da" }}
                    >
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: "#1c1e24" }}>Activity Stream</h3>
                        <p className="text-[11px] font-light mt-0.5" style={{ color: "#8c8e96" }}>
                          WhatsApp → AI → Order → TripBlock → Delivery
                        </p>
                      </div>
                      <div className="pill-group">
                        {["ALL", "ORDERS", "TRIPBLOCKS", "SHOPS"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setActFilter(c)}
                            className={`pill-item ${actFilter === c ? "active" : ""}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table body */}
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #ede9e2" }}>
                          {["Request / Order", "Source", "Type", "Status", "Updated", ""].map((h, i) => (
                            <th
                              key={i}
                              className="px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-widest"
                              style={{ color: "#b0b3bc", background: "#faf8f5" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivity.map((row, idx) => (
                          <React.Fragment key={row.id}>
                            <tr
                              className="data-row"
                              style={{ borderBottom: "1px solid #f0ece6" }}
                              onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                            >
                              <td className="px-5 py-3.5">
                                <span className="text-xs font-semibold" style={{ color: "#1c1e24" }}>{row.itemRef}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-xs font-medium" style={{ color: "#5a5f6b" }}>{row.source}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <CategoryTag cat={row.category} />
                              </td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-[11px] font-medium" style={{ color: "#b0b3bc" }}>{row.updated}</span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="btn-ghost text-xs font-semibold px-3 py-1 rounded-lg"
                                  style={{ color: "#5a5f6b", fontSize: "11px" }}
                                >
                                  {row.actionText}
                                </button>
                              </td>
                            </tr>
                            {expandedRow === row.id && (
                              <tr>
                                <td colSpan={6} style={{ background: "#faf8f5", borderBottom: "1px solid #e5e1da" }}>
                                  <div className="px-5 py-3 flex flex-wrap gap-5 text-xs" style={{ color: "#5a5f6b" }}>
                                    <span><span className="font-semibold" style={{ color: "#1c1e24" }}>Stage:</span> {row.status}</span>
                                    <span><span className="font-semibold" style={{ color: "#1c1e24" }}>Category:</span> {row.category}</span>
                                    <span><span className="font-semibold" style={{ color: "#1c1e24" }}>Updated:</span> {row.updated}</span>
                                    <button type="button" className="ml-auto text-[11px] font-semibold" style={{ color: "#c26d40" }}>
                                      Open Full Detail →
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>

                    {/* Table footer */}
                    <div
                      className="px-5 py-3 flex items-center justify-between"
                      style={{ borderTop: "1px solid #e5e1da", background: "#faf8f5" }}
                    >
                      <span className="text-[11px] font-light" style={{ color: "#b0b3bc" }}>
                        {filteredActivity.length} events · click a row to expand
                      </span>
                      <button type="button" className="text-[11px] font-semibold" style={{ color: "#c26d40" }}>
                        Full stream →
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — 4 cols */}
                <div className="lg:col-span-4 space-y-4">

                  {/* SHOP ACTIVITY */}
                  <div className="warm-card overflow-hidden">
                    <div
                      className="px-5 py-3.5 flex items-center justify-between"
                      style={{ borderBottom: "1px solid #e5e1da" }}
                    >
                      <div className="flex items-center gap-2">
                        <StoreIcon size={14} style={{ color: "#1f6e48" }} />
                        <h3 className="text-xs font-bold" style={{ color: "#1c1e24" }}>Shop Activity</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "#1f6e48" }}>
                        <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: "#3faa6e" }} />
                        Live
                      </div>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#f0ece6" }}>
                      {shopActivity.map((a, i) => (
                        <div
                          key={i}
                          className="px-5 py-3 flex items-start gap-3 transition-colors"
                          style={{ cursor: "default" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#faf8f5")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5"
                            style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                          >
                            {a.shop.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-tight" style={{ color: "#1c1e24" }}>{a.shop}</p>
                            <p className="text-[11px] font-light mt-0.5 leading-tight truncate" style={{ color: "#8c8e96" }}>{a.action}</p>
                          </div>
                          <span className="text-[10px] font-medium shrink-0 mt-0.5" style={{ color: "#b0b3bc" }}>{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OPEN TRIPBLOCKS PREVIEW */}
                  <div className="warm-card overflow-hidden">
                    <div
                      className="px-5 py-3.5 flex items-center justify-between"
                      style={{ borderBottom: "1px solid #e5e1da" }}
                    >
                      <div className="flex items-center gap-2">
                        <TripBlockIcon size={14} style={{ color: "#b84a0a" }} />
                        <h3 className="text-xs font-bold" style={{ color: "#1c1e24" }}>Open TripBlocks</h3>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#fff4ec", color: "#b84a0a", border: "1px solid #f5c4a0" }}
                      >
                        {stats?.openTripBlocks || 0} Available
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#f0ece6" }}>
                      {tripblocks.slice(0, 2).map((tb) => {
                        const claimed = tb.claimedByShop;
                        return (
                          <div key={tb.id} className="px-5 py-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-extrabold" style={{ color: "#1c1e24" }}>{tb.code}</span>
                              <StatusBadge status={claimed ? "CLAIMED" : tb.claimStatus} />
                            </div>
                            <p className="text-xs font-semibold" style={{ color: "#3a3f47" }}>{tb.categoryItems}</p>
                            <p className="text-[10px] font-light mt-0.5" style={{ color: "#8c8e96" }}>
                              {tb.corridor} · {tb.weightQuantity}
                            </p>
                            {tb.deadlineMinutes && !claimed && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold" style={{ color: "#a0510a" }}>
                                <ClockIcon size={10} />
                                {tb.deadlineMinutes}m to claim
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-3" style={{ borderTop: "1px solid #e5e1da", background: "#faf8f5" }}>
                      <button type="button" className="text-[11px] font-semibold" style={{ color: "#c26d40" }} onClick={() => goTo("tripblocks")}>
                        View all TripBlocks →
                      </button>
                    </div>
                  </div>

                  {/* DELIVERIES */}
                  <div className="warm-card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TruckIcon size={14} style={{ color: "#234e72" }} />
                      <h3 className="text-xs font-bold" style={{ color: "#1c1e24" }}>Active Deliveries</h3>
                    </div>
                    {deliveryRows.map((d) => (
                      <div key={d.code}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: "#3a3f47" }}>{d.code} → {d.route.split(" -> ")[1]}</span>
                          <span className="text-[10px] font-bold" style={{ color: "#426890" }}>{d.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#e5e1da" }}>
                          <div className="h-full rounded-full progress-bar" style={{ width: `${d.progress}%`, background: "#426890" }} />
                        </div>
                      </div>
                    ))}
                    {/* GEOGRAPHIC MAP PREVIEW */}
                    <div className="warm-card overflow-hidden">
                      <div
                        className="px-5 py-3.5 flex items-center justify-between"
                        style={{ borderBottom: "1px solid #e5e1da" }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPinIcon size={14} style={{ color: "#c26d40" }} />
                          <h3 className="text-xs font-bold" style={{ color: "#1c1e24" }}>Geographic Coverage</h3>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                        >
                          Live Map
                        </span>
                      </div>
                      <div className="p-4 space-y-3 bg-[#faf8f5]/50">
                        <p className="text-xs text-[#5a5f6b] font-light leading-relaxed">
                          Interactive OpenStreetMap visualization of regional farmer intakes, aggregation corridors, and retail partner stores.
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#8c8e96] border-t border-[#f0ece6] pt-2">
                          <span>{dashboardData?.shops.length || 0} Retail Hubs · {dashboardData?.orders.length || 0} Orders</span>
                          <button
                            type="button"
                            onClick={() => goTo("map")}
                            className="font-bold text-[#c26d40] hover:underline flex items-center gap-1"
                          >
                            Open Live Map →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* ── ORDERS ── */}
            {activeTab === "orders" && (
              <div className="page-enter space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    title="Orders"
                    subtitle="Structured requests ready for grouping into regional TripBlocks."
                  />
                  <div className="pill-group">
                    {["ALL", "TRACTOR", "SEEDS", "GROCERIES", "PESTICIDES"].map((c) => (
                      <button key={c} type="button" className={`pill-item ${c === "ALL" ? "active" : ""}`}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="warm-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Order Code", "Source", "Category", "Items", "Location", "Qty", "Status", ""].map((h, i) => (
                          <th
                            key={i}
                            className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest"
                            style={{ color: "#b0b3bc" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord, idx) => (
                        <tr
                          key={ord.id}
                          className="data-row card-enter"
                          style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 50}ms` }}
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs font-extrabold" style={{ color: "#1c1e24" }}>{ord.code}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-semibold" style={{ color: "#3a3f47" }}>{ord.customer}</span>
                          </td>
                          <td className="px-5 py-3.5"><CategoryTag cat={ord.category} /></td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs" style={{ color: "#5a5f6b" }}>{ord.itemDetails}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-light" style={{ color: "#8c8e96" }}>{ord.location}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-semibold" style={{ color: "#1c1e24" }}>{ord.quantity}</span>
                          </td>
                          <td className="px-5 py-3.5"><StatusBadge status={ord.status} /></td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openOrderDetails(ord.id)}
                              className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                              style={{ color: "#c26d40" }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TRIPBLOCKS ── */}
            {activeTab === "tripblocks" && (
              <div className="page-enter space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="TripBlocks"
                    subtitle="Grouped regional orders — available for nearby retail shops to claim and fulfill."
                  />
                  <span
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0"
                    style={{ background: "#fff4ec", color: "#b84a0a", border: "1px solid #f5c4a0" }}
                  >
                    {stats?.openTripBlocks || 0} open for claims
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tripblocks.map((tb, idx) => {
                    const claimed = tb.claimedByShop;
                    const status: WorkflowStatus = claimed ? "CLAIMED" : tb.claimStatus;
                    const stripeColor =
                      status === "CLAIMED" || status === "LOCKED" ? "#1f6e48"
                      : status === "IN DELIVERY" ? "#234e72"
                      : "#b84a0a";
                    return (
                      <div
                        key={tb.id}
                        className="warm-card card-enter overflow-hidden"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        {/* Thin status stripe */}
                        <div className="h-[3px] w-full" style={{ background: stripeColor }} />

                        <div className="p-5 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-mono text-base font-extrabold" style={{ color: "#1c1e24" }}>
                                {tb.code}
                              </span>
                              <p className="text-[10px] font-medium mt-0.5" style={{ color: "#8c8e96" }}>
                                {tb.orderCount} orders grouped
                              </p>
                            </div>
                            <StatusBadge status={status} />
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold" style={{ color: "#1c1e24" }}>{tb.categoryItems}</p>
                            <p className="text-xs font-light" style={{ color: "#5a5f6b" }}>↗ {tb.corridor}</p>
                            <p className="text-xs font-light" style={{ color: "#5a5f6b" }}>{tb.weightQuantity} total</p>
                          </div>

                          {/* Included orders */}
                          <div className="flex flex-wrap gap-1.5">
                            {tb.orders.map((o) => (
                              <span
                                key={o}
                                className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: "#f4f1eb", color: "#5a5f6b", border: "1px solid #d6d1c7" }}
                              >
                                {o}
                              </span>
                            ))}
                          </div>

                          {/* Trip details / Inspection */}
                          <div className="space-y-2">
                            {claimed ? (
                              <div
                                className="px-3 py-2 rounded-lg text-xs font-semibold"
                                style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                              >
                                ✓ Claimed by: {claimed}
                              </div>
                            ) : (
                              tb.deadlineMinutes ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#a0510a" }}>
                                      <ClockIcon size={11} /> {tb.deadlineMinutes}m remaining
                                    </div>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#f5d5b8" }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${(tb.deadlineMinutes / 60) * 100}%`, background: "#c26d40" }}
                                    />
                                  </div>
                                </div>
                              ) : null
                            )}
                            <button
                              type="button"
                              onClick={() => openTripDetails(tb.id)}
                              className="w-full py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
                              style={{ background: "#ffffff", color: "#1c1e24", borderColor: "#d6d1c7" }}
                            >
                              <EyeIcon size={14} />
                              <span>Inspect Trip Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SHOPS ── */}
            {activeTab === "shops" && (
              <div className="page-enter space-y-5">
                <SectionHeading
                  title="Shop Directory & Management"
                  subtitle="Retail stores enrolled in FarmLink to claim and fulfill regional TripBlocks."
                />
                <div className="warm-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Shop Name", "Corridor / Village", "Owner Contact", "Categories", "Status", "Controls"].map((h) => (
                          <th key={h} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#b0b3bc" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(adminShops.length > 0 ? adminShops : (dashboardData?.shops || []).map((s: any) => ({
                        _id: s.id,
                        shopName: s.name,
                        village: s.village,
                        phone: "",
                        category: s.category || [],
                        isActive: s.isActive !== false,
                        owner: undefined,
                      }))).map((shop, idx) => {
                        const isActive = shop.isActive !== false;
                        return (
                          <tr
                            key={shop._id}
                            className="data-row card-enter"
                            style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 60}ms` }}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                                  style={{
                                    background: isActive ? "#eef7f2" : "#fef0f0",
                                    color: isActive ? "#1f6e48" : "#902020",
                                    border: `1px solid ${isActive ? "#a8d8bc" : "#f0b0b0"}`,
                                  }}
                                >
                                  {shop.shopName.charAt(0)}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold block leading-tight" style={{ color: "#1c1e24" }}>
                                    {shop.shopName}
                                  </span>
                                  {shop.phone && (
                                    <span className="text-[11px] text-[#8c8e96]">{shop.phone}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-light" style={{ color: "#5a5f6b" }}>{shop.village || "—"}</span>
                            </td>
                            <td className="px-5 py-4">
                              {shop.owner ? (
                                <div>
                                  <p className="text-xs font-medium text-[#1c1e24]">{shop.owner.name}</p>
                                  <p className="text-[10px] text-[#8c8e96]">{shop.owner.email}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-[#8c8e96]">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1">
                                {(shop.category || []).map((c: string) => (
                                  <CategoryTag key={c} cat={c} />
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {isActive ? (
                                <span
                                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded"
                                  style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3faa6e" }} />
                                  Active Partner
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded"
                                  style={{ background: "#fff5f5", color: "#902020", border: "1px solid #f0b0b0" }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#d94040" }} />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => handleToggleShopStatus(shop._id)}
                                disabled={togglingShopId === shop._id}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  isActive
                                    ? "text-[#a03020] bg-white hover:bg-[#fff5f5] border-[#f0c0c0]"
                                    : "text-[#1f6e48] bg-[#eef7f2] hover:bg-[#d8f0e2] border-[#a8d8bc]"
                                }`}
                              >
                                {togglingShopId === shop._id
                                  ? "Updating…"
                                  : isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CUSTOMERS ── */}
            {activeTab === "customers" && (
              <div className="page-enter space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <SectionHeading
                    title="Customer Directory"
                    subtitle="Registered farmers sourcing supplies and tractor services through FarmLink."
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search farmer or village…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerPage(1);
                      }}
                      className="text-xs px-3 py-2 rounded-lg border border-[#d6d1c7] bg-white text-[#1c1e24] focus:outline-none focus:border-[#c26d40] w-64 shadow-3xs"
                    />
                  </div>
                </div>

                <div className="warm-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Farmer Name", "Phone", "Village", "Orders Placed", "Registered", "Status"].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#b0b3bc" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#8c8e96]">
                            No registered customers found.
                          </td>
                        </tr>
                      ) : (
                        adminCustomers.map((cust, idx) => (
                          <tr
                            key={cust._id}
                            className="data-row card-enter"
                            style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 40}ms` }}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: "#faf2ed", color: "#c26d40", border: "1px solid #f0d8ca" }}
                                >
                                  {cust.name.charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-[#1c1e24]">{cust.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-[#5a5f6b]">{cust.phone || "—"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-[#5a5f6b]">{cust.village || "—"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{ background: "#fdf5e8", color: "#8a5a00", border: "1px solid #f5cc7a" }}
                              >
                                {cust.totalOrders} {cust.totalOrders === 1 ? "order" : "orders"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] text-[#8c8e96]">
                                {new Date(cust.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3faa6e" }} />
                                Active Farmer
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e1da] bg-[#faf8f5]">
                    <span className="text-[11px] text-[#8c8e96]">
                      Page {customerPage} of {customerTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={customerPage <= 1}
                        onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-[#d6d1c7] bg-white disabled:opacity-40 hover:bg-[#faf8f5]"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={customerPage >= customerTotalPages}
                        onClick={() => setCustomerPage((p) => p + 1)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-[#d6d1c7] bg-white disabled:opacity-40 hover:bg-[#faf8f5]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOPKEEPERS ── */}
            {activeTab === "shopkeepers" && (
              <div className="page-enter space-y-5">
                <SectionHeading
                  title="Shopkeeper Accounts"
                  subtitle="Authorized retail partner accounts responsible for accepting and fulfilling regional TripBlocks."
                />

                <div className="warm-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Name", "Email", "Phone", "Assigned Shop", "Role", "Joined"].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#b0b3bc" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminShopkeepers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#8c8e96]">
                            No registered shopkeepers found.
                          </td>
                        </tr>
                      ) : (
                        adminShopkeepers.map((sk, idx) => (
                          <tr
                            key={sk._id}
                            className="data-row card-enter"
                            style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 40}ms` }}
                          >
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-[#1c1e24]">{sk.name}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-[#5a5f6b]">{sk.email}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-[#5a5f6b]">{sk.phone || "—"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {sk.shop ? (
                                <div>
                                  <p className="text-xs font-semibold text-[#1c1e24]">{sk.shop.shopName}</p>
                                  <p className="text-[10px] text-[#8c8e96]">{sk.shop.village}</p>
                                </div>
                              ) : (
                                <span className="text-xs italic text-[#8c8e96]">Unassigned</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                              >
                                {sk.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] text-[#8c8e96]">
                                {new Date(sk.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {activeTab === "products" && (
              <div className="page-enter space-y-6">
                <SectionHeading
                  title="Products & Catalogs"
                  subtitle="Service categories and aggregated agricultural order demand across regional hubs."
                />

                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8c8e96] mb-3">
                    Supported Fulfillment Categories
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(adminProducts?.supportedCategories || [
                      "Seeds & Fertilizer", "Groceries", "Agricultural Supplies", "Tractor Service", "Pesticides", "Produce"
                    ]).map((cat) => (
                      <div
                        key={cat}
                        className="p-3.5 rounded-xl border border-[#e5e1da] bg-white flex flex-col items-center text-center gap-1.5 shadow-3xs"
                      >
                        <CategoryTag cat={cat} />
                        <span className="text-[10px] text-[#8c8e96] mt-1">Active Category</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demand Table */}
                <div className="warm-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#e5e1da] flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#1c1e24]">Aggregated Product Demand</h3>
                    <span className="text-[10px] text-[#8c8e96]">Based on historical farmer orders</span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Product Item", "Times Ordered", "Total Units Ordered", "Fulfillment Status"].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#b0b3bc" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(!adminProducts?.productStats || adminProducts.productStats.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#8c8e96]">
                            No product order statistics available yet.
                          </td>
                        </tr>
                      ) : (
                        adminProducts.productStats.map((prod, idx) => (
                          <tr
                            key={prod._id || idx}
                            className="data-row card-enter"
                            style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 30}ms` }}
                          >
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-[#1c1e24]">{prod._id || "General Supply"}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-semibold text-[#5a5f6b]">{prod.orderCount} orders</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-[#1c1e24]">{prod.totalQuantity} units</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3faa6e" }} />
                                In Demand
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DELIVERY ── */}
            {activeTab === "delivery" && (
              <div className="page-enter space-y-5">
                <SectionHeading
                  title="Delivery Tracker"
                  subtitle="Claimed TripBlocks currently en route to destination retail stores."
                />
                <div className="space-y-4">
                  {deliveryRows.map((d, idx) => {
                    const step = Math.round((d.progress / 100) * (d.steps.length - 1));
                    return (
                      <div
                        key={d.code}
                        className="warm-card card-enter p-6 space-y-5"
                        style={{ animationDelay: `${idx * 90}ms` }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2.5 mb-1">
                              <span className="font-mono font-extrabold" style={{ color: "#1c1e24" }}>{d.code}</span>
                              <StatusBadge status={d.status} />
                            </div>
                            <p className="text-sm font-semibold" style={{ color: "#1c1e24" }}>{d.route}</p>
                            <p className="text-xs font-light mt-0.5" style={{ color: "#8c8e96" }}>{d.items}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8c8e96" }}>ETA</p>
                            <p className={`${cormorant.className} text-2xl font-medium`} style={{ color: "#1c1e24" }}>{d.eta}</p>
                          </div>
                        </div>

                        {/* Milestone stepper */}
                        <div className="flex items-center">
                          {d.steps.map((s, i) => {
                            const done = i <= step;
                            return (
                              <React.Fragment key={s}>
                                <div className="flex flex-col items-center min-w-0">
                                  <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2"
                                    style={{
                                      background: done ? "#426890" : "#ffffff",
                                      borderColor: done ? "#426890" : "#d6d1c7",
                                      color: done ? "#ffffff" : "#b0b3bc",
                                    }}
                                  >
                                    {done ? <CheckIcon size={10} /> : i + 1}
                                  </div>
                                  <p
                                    className="text-[9px] font-semibold mt-1.5 text-center max-w-[60px] leading-tight"
                                    style={{ color: done ? "#426890" : "#b0b3bc" }}
                                  >
                                    {s}
                                  </p>
                                </div>
                                {i < d.steps.length - 1 && (
                                  <div
                                    className="flex-1 h-px mb-4 mx-1"
                                    style={{ background: i < step ? "#426890" : "#e5e1da" }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-medium mb-1.5" style={{ color: "#8c8e96" }}>
                            <span>Progress</span>
                            <span>{d.progress}% complete</span>
                          </div>
                          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#e5e1da" }}>
                            <div className="h-full rounded-full progress-bar" style={{ width: `${d.progress}%`, background: "#426890" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── MAP VIEW ── */}
            {activeTab === "map" && <MapView />}

            {/* ── SETTINGS VIEW ── */}
            {activeTab === "settings" && <SettingsSection />}

            {/* ── ORDER DETAILS MODAL ── */}
            {selectedOrderId && (
              <div className="fixed inset-0 z-50 bg-[#1c1e24]/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="warm-card max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(null)}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-1 rounded-md text-[#8c8e96] hover:text-[#1c1e24] hover:bg-[#faf8f5]"
                  >
                    <XIcon size={18} />
                  </button>

                  <div className="border-b border-[#e5e1da] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8e96]">Order Inspection</span>
                    <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24] mt-0.5`}>
                      Order #{orderDetails?.products?.[0]?.name ? `${selectedOrderId.slice(-6).toUpperCase()}` : selectedOrderId.slice(-6).toUpperCase()}
                    </h3>
                  </div>

                  {loadingOrderDetails ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <div className="h-7 w-7 rounded-full border-2 animate-spin" style={{ borderColor: "#c26d40", borderTopColor: "transparent" }} />
                      <p className="text-xs text-[#8c8e96]">Loading order details…</p>
                    </div>
                  ) : orderDetails ? (
                    <div className="space-y-4 text-xs">
                      {/* Status & Service */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#faf2ed] text-[#c26d40] border border-[#f0d8ca]">
                          {orderDetails.serviceType}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                          {orderDetails.status}
                        </span>
                      </div>

                      {/* Farmer & Shop Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Customer / Farmer</p>
                          <p className="font-bold text-[#1c1e24] mt-0.5">{orderDetails.farmer?.name || "Farmer"}</p>
                          <p className="text-[#5a5f6b] mt-0.5">{orderDetails.farmer?.phone || "No phone recorded"}</p>
                          <p className="text-[#8c8e96]">{orderDetails.farmer?.village || "Village unspecified"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Assigned Retail Shop</p>
                          {orderDetails.assignedShop ? (
                            <>
                              <p className="font-bold text-[#1c1e24] mt-0.5">{orderDetails.assignedShop.shopName}</p>
                              <p className="text-[#5a5f6b] mt-0.5">{orderDetails.assignedShop.phone || "No phone recorded"}</p>
                              <p className="text-[#8c8e96]">{orderDetails.assignedShop.village || ""}</p>
                            </>
                          ) : (
                            <p className="text-[#8c8e96] italic mt-0.5">Not claimed by a shop yet</p>
                          )}
                        </div>
                      </div>

                      {/* Products list */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8c8e96] mb-2">Requested Items</p>
                        <div className="border border-[#e5e1da] rounded-xl overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-[#faf8f5] border-b border-[#e5e1da]">
                              <tr>
                                <th className="px-3 py-2 text-[10px] font-bold text-[#8c8e96]">Item</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-[#8c8e96]">Category</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-[#8c8e96] text-right">Quantity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece6]">
                              {orderDetails.products?.map((p, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium text-[#1c1e24]">{p.name}</td>
                                  <td className="px-3 py-2 text-[#5a5f6b]">{p.category || orderDetails.serviceType}</td>
                                  <td className="px-3 py-2 text-right font-bold text-[#1c1e24]">{p.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="border-t border-[#e5e1da] pt-3 flex flex-wrap justify-between text-[11px] text-[#8c8e96]">
                        <span>Created: {new Date(orderDetails.createdAt).toLocaleString()}</span>
                        <span>Updated: {new Date(orderDetails.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#902020]">Order details unavailable.</p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(null)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#faf8f5] border border-[#d6d1c7] text-[#1c1e24] hover:bg-[#eee9df]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TRIP DETAILS MODAL ── */}
            {selectedTripId && (
              <div className="fixed inset-0 z-50 bg-[#1c1e24]/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="warm-card max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedTripId(null)}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-1 rounded-md text-[#8c8e96] hover:text-[#1c1e24] hover:bg-[#faf8f5]"
                  >
                    <XIcon size={18} />
                  </button>

                  <div className="border-b border-[#e5e1da] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8e96]">TripBlock Inspection</span>
                    <h3 className={`${cormorant.className} text-2xl font-bold text-[#1c1e24] mt-0.5`}>
                      TripBlock #{tripDetails ? `${selectedTripId.slice(-6).toUpperCase()}` : selectedTripId.slice(-6).toUpperCase()}
                    </h3>
                  </div>

                  {loadingTripDetails ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <div className="h-7 w-7 rounded-full border-2 animate-spin" style={{ borderColor: "#c26d40", borderTopColor: "transparent" }} />
                      <p className="text-xs text-[#8c8e96]">Loading TripBlock data…</p>
                    </div>
                  ) : tripDetails ? (
                    <div className="space-y-4 text-xs">
                      {/* Status & Service */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#faf2ed] text-[#c26d40] border border-[#f0d8ca]">
                          {tripDetails.serviceType}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                          {tripDetails.status}
                        </span>
                      </div>

                      {/* Route metrics strip */}
                      {tripDetails.routeDetails && (
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da] text-center">
                          <div>
                            <p className="text-[10px] text-[#8c8e96] uppercase font-bold">Stops</p>
                            <p className="text-base font-extrabold text-[#1c1e24] mt-0.5">
                              {tripDetails.routeDetails.waypoints?.length || tripDetails.orders?.length || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8c8e96] uppercase font-bold">Total Distance</p>
                            <p className="text-base font-extrabold text-[#c26d40] mt-0.5">
                              {tripDetails.routeDetails.totalDistanceKm ? `${tripDetails.routeDetails.totalDistanceKm} km` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8c8e96] uppercase font-bold">Est. Duration</p>
                            <p className="text-base font-extrabold text-[#1c1e24] mt-0.5">
                              {tripDetails.routeDetails.estimatedDurationMinutes ? `${tripDetails.routeDetails.estimatedDurationMinutes} mins` : "—"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Assigned Shop info */}
                      <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                        <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Assigned Shop</p>
                        {tripDetails.assignedShop ? (
                          <div className="flex justify-between items-center mt-1">
                            <div>
                              <p className="font-bold text-[#1c1e24]">{tripDetails.assignedShop.shopName}</p>
                              <p className="text-[#5a5f6b]">{tripDetails.assignedShop.village || "No village specified"}</p>
                            </div>
                            <span className="text-xs font-semibold text-[#1f6e48] bg-[#eef7f2] border border-[#a8d8bc] px-2 py-0.5 rounded">
                              Claimed & Active
                            </span>
                          </div>
                        ) : (
                          <p className="text-[#8c8e96] italic mt-0.5">Open — waiting for a local shop claim</p>
                        )}
                      </div>

                      {/* Grouped Orders list */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8c8e96] mb-2">
                          Grouped Orders ({tripDetails.orders?.length || 0})
                        </p>
                        <div className="border border-[#e5e1da] rounded-xl overflow-hidden divide-y divide-[#f0ece6]">
                          {(tripDetails.orders || []).map((ord: any, idx: number) => (
                            <div key={ord._id || idx} className="p-3 flex items-center justify-between hover:bg-[#faf8f5]">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#1c1e24]">
                                  #{ord.code || (ord._id ? ord._id.slice(-6).toUpperCase() : `ORD-${idx + 1}`)}
                                </span>
                                <p className="text-[11px] text-[#5a5f6b] mt-0.5">
                                  {ord.farmer?.name || "Local Farmer"} · {ord.destination?.village || "Regional"}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-[#1c1e24]">
                                  {ord.products?.map((p: any) => `${p.quantity} ${p.name}`).join(", ") || `${ord.totalAmount || 0} INR`}
                                </span>
                                <p className="text-[10px] text-[#8c8e96]">{ord.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="border-t border-[#e5e1da] pt-3 flex flex-wrap justify-between text-[11px] text-[#8c8e96]">
                        <span>Created: {new Date(tripDetails.createdAt).toLocaleString()}</span>
                        {tripDetails.claimedAt && <span>Claimed: {new Date(tripDetails.claimedAt).toLocaleString()}</span>}
                        {tripDetails.completedAt && <span>Completed: {new Date(tripDetails.completedAt).toLocaleString()}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#902020]">Trip details unavailable.</p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTripId(null)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#faf8f5] border border-[#d6d1c7] text-[#1c1e24] hover:bg-[#eee9df]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
