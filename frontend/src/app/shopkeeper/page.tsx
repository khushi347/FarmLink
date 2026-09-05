"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  shopApi,
  tripApi,
  ShopTrip,
  ShopDashboardMetrics,
  ShopNotification,
  ShopRevenueData,
} from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import ShopSidebar from "@/components/shopkeeper/ShopSidebar";
import ShopHeader from "@/components/shopkeeper/ShopHeader";
import ShopTripCard from "@/components/shopkeeper/ShopTripCard";
import ShopNotificationsDrawer from "@/components/shopkeeper/ShopNotificationsDrawer";
import ShopRevenueView from "@/components/shopkeeper/ShopRevenueView";
import ShopAcceptanceRateView from "@/components/shopkeeper/ShopAcceptanceRateView";

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

export default function ShopkeeperDashboardPage() {
  const { user, token, isLoading } = useAuth();
  const { subscribe } = useRealtime();

  // Navigation and Drawer states
  const [activeTab, setActiveTab] = useState<string>("available");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  // Data states
  const [metrics, setMetrics] = useState<ShopDashboardMetrics | null>(null);
  const [availableTrips, setAvailableTrips] = useState<ShopTrip[]>([]);
  const [activeTrips, setActiveTrips] = useState<ShopTrip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<ShopTrip[]>([]);
  const [revenueData, setRevenueData] = useState<ShopRevenueData | null>(null);
  const [notifications, setNotifications] = useState<ShopNotification[]>([]);

  // Filter and Action states
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [claimingTripId, setClaimingTripId] = useState<string | null>(null);
  const [completingTripId, setCompletingTripId] = useState<string | null>(null);
  const [justClaimedTripId, setJustClaimedTripId] = useState<string | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load all dashboard datasets
  const loadAllData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const [
        dashRes,
        availRes,
        acceptedRes,
        completedRes,
        revenueRes,
        notifRes,
      ] = await Promise.all([
        shopApi.getDashboard(token),
        shopApi.getAvailableTrips(categoryFilter !== "ALL" ? { serviceType: categoryFilter } : undefined, token),
        shopApi.getAcceptedTrips(categoryFilter !== "ALL" ? { serviceType: categoryFilter } : undefined, token),
        shopApi.getCompletedTrips(categoryFilter !== "ALL" ? { serviceType: categoryFilter } : undefined, token),
        shopApi.getRevenue(token),
        shopApi.getNotifications(token),
      ]);

      if (dashRes.success) setMetrics(dashRes.data);
      if (availRes.success) setAvailableTrips(availRes.data);
      if (acceptedRes.success) setActiveTrips(acceptedRes.data);
      if (completedRes.success) setCompletedTrips(completedRes.data);
      if (revenueRes.success) setRevenueData(revenueRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
    } catch (err: any) {
      console.error("[Shopkeeper] Failed to load dashboard data:", err);
      setError(err?.message || "Unable to load shopkeeper data");
    }
  }, [token, categoryFilter]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time socket events
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadAllData();
        debounceTimerRef.current = null;
      }, 300);
    };

    const cleanups = [
      subscribe("trip_created", () => {
        handleRealtimeUpdate();
      }),
      subscribe("trip_claimed", (payload: any) => {
        if (payload?.tripId) {
          setAvailableTrips((prev) => prev.filter((t) => (t._id || t.id) !== payload.tripId));
        }
        handleRealtimeUpdate();
      }),
      subscribe("trip_completed", () => {
        handleRealtimeUpdate();
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [subscribe, loadAllData]);

  // Claim Trip Action
  const handleClaimTrip = async (tripId: string) => {
    if (!token) return;
    setClaimingTripId(tripId);
    try {
      const res = await tripApi.claim(tripId, token);
      if (res.success) {
        setJustClaimedTripId(tripId);
        setToastMessage("Trip claimed and assigned to your shop.");

        const claimed = availableTrips.find((t) => (t._id || t.id) === tripId);
        if (claimed) {
          setAvailableTrips((prev) => prev.filter((t) => (t._id || t.id) !== tripId));
          setActiveTrips((prev) => [{ ...claimed, status: "CLAIMED" }, ...prev]);
        }

        await loadAllData();

        setTimeout(() => {
          setJustClaimedTripId(null);
          setActiveTab("active");
        }, 1800);
      }
    } catch (err: any) {
      console.error("Claim error:", err);
      setToastMessage(err?.message || "Unable to claim trip");
    } finally {
      setClaimingTripId(null);
    }
  };

  // Complete Trip Action
  const handleCompleteTrip = async (tripId: string) => {
    if (!token) return;
    setCompletingTripId(tripId);
    try {
      const res = await tripApi.complete(tripId, token);
      if (res.success) {
        setToastMessage(`Delivery completed. ₹${res.trip?.estimatedEarnings || 0} credited.`);

        const completed = activeTrips.find((t) => (t._id || t.id) === tripId);
        if (completed) {
          setActiveTrips((prev) => prev.filter((t) => (t._id || t.id) !== tripId));
          setCompletedTrips((prev) => [{ ...completed, status: "COMPLETED" }, ...prev]);
        }

        await loadAllData();

        setTimeout(() => {
          setActiveTab("completed");
        }, 1000);
      }
    } catch (err: any) {
      console.error("Complete error:", err);
      setToastMessage(err?.message || "Unable to complete delivery");
    } finally {
      setCompletingTripId(null);
    }
  };

  // Notifications Actions
  const handleMarkNotifRead = async (id: string) => {
    if (!token) return;
    try {
      await shopApi.markNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      if (metrics) {
        setMetrics({
          ...metrics,
          unreadNotifications: Math.max(0, metrics.unreadNotifications - 1),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    if (!token) return;
    try {
      await shopApi.markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (metrics) {
        setMetrics({ ...metrics, unreadNotifications: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Demo Action
  const handleResetDemo = async () => {
    if (!token) return;
    setIsResettingDemo(true);
    try {
      await shopApi.resetDemo(token);
      setJustClaimedTripId(null);
      await loadAllData();
      setActiveTab("available");
      setToastMessage("Demo records reset to starting state.");
    } catch (err: any) {
      console.error("Reset error:", err);
      setToastMessage(err?.message || "Unable to reset demo");
    } finally {
      setIsResettingDemo(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#faf8f5] ${jakarta.className}`}>
        <p className={`${cormorant.className} text-lg italic text-[#8c8e96]`}>
          Loading workspace…
        </p>
      </div>
    );
  }

  if (!user || user.role !== "shopkeeper") {
    return null;
  }

  const filteredAvailable = availableTrips.filter((t) =>
    categoryFilter === "ALL" ? true : t.serviceType.toUpperCase() === categoryFilter.toUpperCase()
  );

  const filteredActive = activeTrips.filter((t) =>
    categoryFilter === "ALL" ? true : t.serviceType.toUpperCase() === categoryFilter.toUpperCase()
  );

  const filteredCompleted = completedTrips.filter((t) =>
    categoryFilter === "ALL" ? true : t.serviceType.toUpperCase() === categoryFilter.toUpperCase()
  );

  const summaryMetrics = [
    {
      id: "available",
      label: "Available",
      val: String(metrics?.available || availableTrips.length),
      sub: "Open corridors",
      accent: "#c26d40",
    },
    {
      id: "active",
      label: "Active",
      val: String(metrics?.acceptedTrips || activeTrips.length),
      sub: "In fulfillment",
      accent: "#8a5a00",
    },
    {
      id: "completed",
      label: "Completed",
      val: String(metrics?.completedTrips || completedTrips.length),
      sub: "Delivered trips",
      accent: "#1f6e48",
    },
    {
      id: "revenue",
      label: "Revenue",
      val: `₹${(metrics?.revenue || 0).toLocaleString()}`,
      sub: "Total earnings",
      accent: "#1f6e48",
    },
    {
      id: "acceptance",
      label: "Acceptance",
      val: `${metrics?.acceptanceRate || 100}%`,
      sub: "Fulfillment score",
      accent: "#2c3e50",
    },
  ];

  return (
    <div className={`min-h-screen flex bg-[#faf8f5] text-[#1c1e24] ${jakarta.className}`}>
      {/* Subtle Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-4 py-2.5 rounded-lg bg-[#1c1e24] text-white text-xs font-medium shadow-lg border border-white/10">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      <ShopNotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllNotifsRead}
      />

      {/* Sidebar */}
      <ShopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        metrics={metrics}
        onResetDemo={handleResetDemo}
        isResettingDemo={isResettingDemo}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ShopHeader
          shopName={metrics?.shopName || "Kisan Krishi Kendra"}
          village={metrics?.village || "Rampura"}
          unreadCount={metrics?.unreadNotifications || 0}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onResetDemo={handleResetDemo}
          isResettingDemo={isResettingDemo}
        />

        <main className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-7">
          {error && (
            <div className="p-3 rounded-lg bg-[#fff5f5] border border-[#f0b0b0] text-xs text-[#902020] flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={loadAllData} className="underline font-medium">
                Retry
              </button>
            </div>
          )}

          {/* Sub-header Strip */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#e5e1da]">
            <div>
              <h2 className={`${cormorant.className} text-[26px] font-medium tracking-wide text-[#1c1e24] leading-tight`}>
                Shopkeeper Operations
              </h2>
              <p className="text-xs text-[#8c8e96] mt-0.5 font-light">
                Regional dispatch corridors, active deliveries, and partner earnings.
              </p>
            </div>

            {/* Filter Pills */}
            {(activeTab === "available" || activeTab === "active" || activeTab === "completed") && (
              <div className="pill-group">
                {["ALL", "SEEDS", "FERTILIZER", "PESTICIDES"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`pill-item ${categoryFilter === cat ? "active" : ""}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5 Clean Metrics Cards — Matching Coordinator Dashboard 'warm-card' */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summaryMetrics.map((m) => {
              const active = activeTab === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  className="warm-card p-4 cursor-pointer transition-all duration-150"
                  style={{
                    borderLeft: `3px solid ${m.accent}`,
                    background: active ? "#ffffff" : "",
                    boxShadow: active ? "0 1px 3px rgba(28, 30, 36, 0.05)" : "",
                  }}
                >
                  <p className="text-[11px] font-semibold leading-snug text-[#8c8e96]">
                    {m.label}
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums text-[#1c1e24] mt-1">
                    {m.val}
                  </p>
                  <p className="text-[10px] font-medium text-[#b0b3bc] mt-0.5">
                    {m.sub}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── TAB CONTENT ── */}

          {/* 1. Available Trips Tab */}
          {activeTab === "available" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`${cormorant.className} text-xl font-medium text-[#1c1e24]`}>
                  Available Corridors ({filteredAvailable.length})
                </h3>
              </div>

              {filteredAvailable.length === 0 ? (
                <div className="py-16 text-center warm-card p-8 space-y-2">
                  <p className="text-sm font-medium text-[#1c1e24]">No corridors available</p>
                  <p className="text-xs text-[#8c8e96] max-w-sm mx-auto">
                    All currently generated batches are claimed or completed.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAvailable.map((trip) => (
                    <ShopTripCard
                      key={trip._id || trip.id}
                      trip={trip}
                      onClaim={handleClaimTrip}
                      isClaiming={claimingTripId === (trip._id || trip.id)}
                      justClaimed={justClaimedTripId === (trip._id || trip.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Active Trips Tab */}
          {activeTab === "active" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`${cormorant.className} text-xl font-medium text-[#1c1e24]`}>
                  Active Dispatches ({filteredActive.length})
                </h3>
              </div>

              {filteredActive.length === 0 ? (
                <div className="py-16 text-center warm-card p-8 space-y-2">
                  <p className="text-sm font-medium text-[#1c1e24]">No active dispatches</p>
                  <p className="text-xs text-[#8c8e96] max-w-sm mx-auto">
                    Claim an available corridor to begin fulfillment.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("available")}
                    className="text-xs font-semibold text-[#c26d40] hover:underline pt-1"
                  >
                    View Available Corridors →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActive.map((trip) => (
                    <ShopTripCard
                      key={trip._id || trip.id}
                      trip={trip}
                      onComplete={handleCompleteTrip}
                      isCompleting={completingTripId === (trip._id || trip.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Completed Trips Tab */}
          {activeTab === "completed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`${cormorant.className} text-xl font-medium text-[#1c1e24]`}>
                  Completed Deliveries ({filteredCompleted.length})
                </h3>
              </div>

              {filteredCompleted.length === 0 ? (
                <div className="py-16 text-center warm-card p-8 space-y-1">
                  <p className="text-sm font-medium text-[#1c1e24]">No completed deliveries</p>
                  <p className="text-xs text-[#8c8e96]">
                    Delivered corridors will appear here with confirmation receipts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCompleted.map((trip) => (
                    <ShopTripCard key={trip._id || trip.id} trip={trip} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Revenue Tab */}
          {activeTab === "revenue" && (
            <ShopRevenueView
              revenueData={revenueData}
              onViewTrips={() => setActiveTab("completed")}
            />
          )}

          {/* 5. Acceptance Rate Tab */}
          {activeTab === "acceptance" && (
            <ShopAcceptanceRateView
              acceptanceRate={metrics?.acceptanceRate || 100}
              availableCount={availableTrips.length}
              activeCount={activeTrips.length}
              completedCount={completedTrips.length}
            />
          )}

          {/* 6. Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`${cormorant.className} text-xl font-medium text-[#1c1e24]`}>
                  Notifications Log
                </h3>

                {notifications.some((n) => !n.isRead) && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifsRead}
                    className="text-xs font-medium text-[#c26d40] hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-[#e5e1da] divide-y divide-[#f0ece6] overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#8c8e96]">
                    No notifications recorded.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.isRead && handleMarkNotifRead(n._id)}
                      className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                        !n.isRead ? "bg-[#fffdfb]" : "hover:bg-[#faf8f5]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[#1c1e24]">{n.title}</span>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#c26d40]" />
                          )}
                        </div>
                        <p className="text-xs text-[#5a5f6b]">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-[#8c8e96] shrink-0">
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
