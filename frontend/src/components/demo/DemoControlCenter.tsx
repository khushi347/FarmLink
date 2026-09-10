"use client";

/**
 * DemoControlCenter.tsx — Interactive Demo Scenarios Hub
 *
 * Implements 4 interactive, production-grade scenarios using FarmLink's
 * real APIs, Gemini AI extraction, geospatial grouping engine, atomic claim concurrency,
 * and Socket.IO real-time notification cascade.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { demoApi } from "@/lib/demoApi";
import { useDemoRealtime } from "@/hooks/useDemoRealtime";

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

interface DemoControlCenterProps {
    sessionId: string;
    onRefreshMap: () => void;
}

export default function DemoControlCenter({ sessionId, onRefreshMap }: DemoControlCenterProps) {
    // ── Real-Time Socket Connection ─────────────────────────────────
    const { status: socketStatus, subscribe } = useDemoRealtime(sessionId);

    // ── Scenario 1 State (AI Order) ─────────────────────────────────
    const [aiInputText, setAiInputText] = useState(
        "मुझे कल 4 बोरी डीएपी खाद चाहिए"
    );
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any | null>(null);

    // ── Scenario 2 State (Shared Delivery Grouping) ─────────────────
    const [groupingLoading, setGroupingLoading] = useState(false);
    const [groupingResult, setGroupingResult] = useState<any | null>(null);

    // ── Scenario 3 State (Shop Competition) ─────────────────────────
    const [competitionLoading, setCompetitionLoading] = useState(false);
    const [competitionResult, setCompetitionResult] = useState<any | null>(null);

    // ── Scenario 4 State (Real-Time Notification) ───────────────────
    const [realtimeLoading, setRealtimeLoading] = useState(false);
    const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

    // ── Global & Reset State ────────────────────────────────────────
    const [resetting, setResetting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const t = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toastMessage]);

    // ── Socket.IO Real-time Subscriptions ───────────────────────────
    useEffect(() => {
        const unsubNotification = subscribe<any>("notification_received", (payload) => {
            setLiveNotifications((prev) => [payload, ...prev]);
            setToastMessage(`🔔 Socket.IO: ${payload.title} (${payload.tripCode || "New Trip"})`);
            onRefreshMap();
        });

        const unsubTripCreated = subscribe<any>("demo:tripblock_created", () => {
            onRefreshMap();
        });

        const unsubTripClaimed = subscribe<any>("demo:trip_claimed", () => {
            onRefreshMap();
        });

        return () => {
            unsubNotification();
            unsubTripCreated();
            unsubTripClaimed();
        };
    }, [subscribe, onRefreshMap]);

    // ── Preset Selection for Scenario 1 ─────────────────────────────
    const handleSelectPreset = (preset: "hindi_dap" | "hinglish_wheat" | "english_pesticide") => {
        if (preset === "hindi_dap") {
            setAiInputText("मुझे कल 4 बोरी डीएपी खाद चाहिए");
        } else if (preset === "hinglish_wheat") {
            setAiInputText("50 kg gehu ke beej chahiye Kolar Road pe jaldi");
        } else {
            setAiInputText("Need 2 packets of organic pesticide for tomato crop on Monday");
        }
    };

    // ── Scenario 1 Runner: AI Order ─────────────────────────────────
    const handleRunAiOrder = async () => {
        if (!aiInputText.trim()) return;
        setAiLoading(true);
        setErrorMessage(null);
        try {
            const res = await demoApi.runAiOrderScenario(aiInputText.trim(), sessionId);
            if (res.success) {
                setAiResult(res);
                setToastMessage(`Order ${res.order.code} created via ${res.extractionSource}`);
                onRefreshMap();
            }
        } catch (err: any) {
            setErrorMessage(err.message || "AI extraction scenario failed");
        } finally {
            setAiLoading(false);
        }
    };

    // ── Scenario 2 Runner: Shared Delivery Grouping ─────────────────
    const handleRunSharedDelivery = async () => {
        setGroupingLoading(true);
        setErrorMessage(null);
        try {
            const res = await demoApi.runSharedDeliveryScenario(sessionId);
            if (res.success) {
                setGroupingResult(res);
                setToastMessage(`TripBlock ${res.tripBlock.code} created! 6 orders grouped via groupingService.js`);
                onRefreshMap();
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Shared delivery grouping scenario failed");
        } finally {
            setGroupingLoading(false);
        }
    };

    // ── Scenario 3 Runner: Shop Competition ─────────────────────────
    const handleRunShopCompetition = async () => {
        setCompetitionLoading(true);
        setErrorMessage(null);
        try {
            const res = await demoApi.runShopCompetitionScenario(sessionId);
            if (res.success) {
                setCompetitionResult(res);
                setToastMessage(`Competition resolved: ${res.winner.shopName} claimed ${res.tripCode} (2 conflicts rejected)`);
                onRefreshMap();
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Shop competition scenario failed");
        } finally {
            setCompetitionLoading(false);
        }
    };

    // ── Scenario 4 Runner: Real-Time Notification ───────────────────
    const handleRunRealtimeNotification = async () => {
        setRealtimeLoading(true);
        setErrorMessage(null);
        try {
            const res = await demoApi.runRealtimeNotificationScenario(sessionId);
            if (res.success) {
                setToastMessage(`Real-time event emitted! Persistent notification saved to MongoDB.`);
                onRefreshMap();
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Real-time notification scenario failed");
        } finally {
            setRealtimeLoading(false);
        }
    };

    // ── 1-Click Reset Runner ────────────────────────────────────────
    const handleResetAll = async () => {
        setResetting(true);
        setErrorMessage(null);
        try {
            const res = await demoApi.resetScenarios(sessionId);
            if (res.success) {
                setAiResult(null);
                setGroupingResult(null);
                setCompetitionResult(null);
                setLiveNotifications([]);
                setToastMessage(`Clean Reset: Wiped ${res.deleted.orders} orders, ${res.deleted.tripBlocks} trips, ${res.deleted.notifications} notifications.`);
                onRefreshMap();
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Reset failed");
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className={`space-y-6 ${jakarta.className}`}>
            {/* ── Top Header & Session Bar ──────────────────────────── */}
            <div className="bg-white border border-[#e5e1da] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className={`${cormorant.className} text-2xl font-bold tracking-tight text-[#1c1e24]`}>
                            Demo Control Center
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                            Live Pipeline
                        </span>
                    </div>
                    <p className="text-xs text-[#5a5f6b] mt-0.5">
                        Real MongoDB operations · Gemini 2.5 Flash · Geospatial Grouping · Concurrency Locks · WebSockets
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] text-xs">
                        <span className={`h-2 w-2 rounded-full ${socketStatus === "connected" ? "bg-[#1f6e48] animate-pulse" : "bg-[#c26d40]"}`} />
                        <span className="text-[11px] font-semibold text-[#5a5f6b]">
                            Socket.IO: {socketStatus}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleResetAll}
                        disabled={resetting}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#fff5f5] text-[#902020] border border-[#f0b0b0] hover:bg-[#ffe5e5] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {resetting ? "Cleaning…" : "↺ Reset Demo Session"}
                    </button>
                </div>
            </div>

            {/* Toast Feedback */}
            {toastMessage && (
                <div className="p-3.5 rounded-xl bg-[#eef7f2] border border-[#a8d8bc] text-xs font-medium text-[#1f6e48] flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>{toastMessage}</span>
                    </div>
                    <button type="button" onClick={() => setToastMessage(null)} className="text-[#1f6e48] hover:opacity-75">✕</button>
                </div>
            )}

            {/* Error Feedback */}
            {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#fff5f5] border border-[#f0b0b0] text-xs font-medium text-[#902020] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>⚠</span>
                        <span>{errorMessage}</span>
                    </div>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-[#902020] hover:opacity-75">✕</button>
                </div>
            )}

            {/* ── 4 SCENARIO CARDS GRID (Balanced 2-Column Responsive Dashboard) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

                {/* ══════════════════════════════════════════════════════════════
                    SCENARIO 1: AI ORDER INGESTION
                ══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-[#e5e1da] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-lg bg-[#fff8f2] text-[#c26d40] border border-[#f5d5b8] flex items-center justify-center font-bold text-xs">
                                    1
                                </span>
                                <h3 className={`${cormorant.className} text-xl font-bold text-[#1c1e24]`}>
                                    Scenario 1 — Multilingual AI Order Extraction
                                </h3>
                            </div>
                            <p className="text-xs text-[#5a5f6b] mt-1">
                                Voice / Text Ingestion ➔ Real Gemini AI Extraction ➔ Structured JSON ➔ MongoDB Order Record
                            </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#faf8f5] text-[#8c8e96] border border-[#e5e1da]">
                            geminiService.js
                        </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#8c8e96]">Preset Samples:</span>
                        <button
                            type="button"
                            onClick={() => handleSelectPreset("hindi_dap")}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#faf8f5] border border-[#e5e1da] text-[#1c1e24] hover:border-[#c26d40] transition-colors"
                        >
                            🇮🇳 Hindi (4 बोरी डीएपी खाद)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectPreset("hinglish_wheat")}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#faf8f5] border border-[#e5e1da] text-[#1c1e24] hover:border-[#c26d40] transition-colors"
                        >
                            🌾 Hinglish (50kg Gehu Seed)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectPreset("english_pesticide")}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#faf8f5] border border-[#e5e1da] text-[#1c1e24] hover:border-[#c26d40] transition-colors"
                        >
                            🍅 English (2 packets pesticide)
                        </button>
                    </div>

                    {/* Input box */}
                    <div className="space-y-2">
                        <textarea
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            rows={2}
                            placeholder="Type a natural language order request in Hindi, Hinglish, or English…"
                            className="w-full text-xs p-3 rounded-xl border border-[#e5e1da] bg-[#faf8f5] text-[#1c1e24] focus:outline-hidden focus:border-[#c26d40] focus:bg-white resize-none"
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleRunAiOrder}
                                disabled={aiLoading || !aiInputText.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c26d40] text-white hover:bg-[#a0510a] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                {aiLoading ? "Extracting with Gemini…" : "▶ Run AI Order Ingestion"}
                            </button>
                        </div>
                    </div>

                    {/* AI Result Card */}
                    {aiResult && (
                        <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e5e1da] space-y-3 animate-fadeIn">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e1da] pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#1c1e24]">
                                        Generated Order: {aiResult.order.code}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                                        {aiResult.order.status}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f2f4ff] text-[#3a4fa0] border border-[#c8d0f5]">
                                    Source: {aiResult.extractionSource}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Customer</p>
                                    <p className="font-semibold text-[#1c1e24]">{aiResult.farmer.name}</p>
                                    <p className="text-[11px] text-[#5a5f6b]">{aiResult.farmer.phone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Service Category</p>
                                    <p className="font-semibold text-[#c26d40]">{aiResult.order.serviceType}</p>
                                    <p className="text-[11px] text-[#5a5f6b]">Language: {aiResult.aiData.language}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Extracted Products</p>
                                    {aiResult.order.products.map((p: any, idx: number) => (
                                        <p key={idx} className="font-semibold text-[#1c1e24]">
                                            {p.quantity} {p.unit} · {p.name}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SCENARIO 2: SHARED DELIVERY (GROUPING ENGINE)
                ══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-[#e5e1da] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-lg bg-[#edf4fb] text-[#234e72] border border-[#a8c8e8] flex items-center justify-center font-bold text-xs">
                                    2
                                </span>
                                <h3 className={`${cormorant.className} text-xl font-bold text-[#1c1e24]`}>
                                    Scenario 2 — Shared Delivery Grouping Engine
                                </h3>
                            </div>
                            <p className="text-xs text-[#5a5f6b] mt-1">
                                6 Nearby Field Orders ➔ Real groupingService.js ($near 10km, 5h window) ➔ Transactional TripBlock
                            </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#faf8f5] text-[#8c8e96] border border-[#e5e1da]">
                            groupingService.js
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-[#5a5f6b]">
                            Seeds 6 clustered orders in Rampura (&lt;1.5km spread) and triggers the canonical grouping algorithm.
                        </div>
                        <button
                            type="button"
                            onClick={handleRunSharedDelivery}
                            disabled={groupingLoading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#234e72] text-white hover:bg-[#1a3d5a] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {groupingLoading ? "Running Grouping Engine…" : "▶ Seed 6 Orders & Group"}
                        </button>
                    </div>

                    {/* Grouping Result Card */}
                    {groupingResult && (
                        <div className="p-4 rounded-xl bg-[#edf4fb] border border-[#a8c8e8] space-y-3 animate-fadeIn">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#a8c8e8]/50 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#1c1e24]">
                                        TripBlock: {groupingResult.tripBlock.code}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                                        Status: {groupingResult.tripBlock.status}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-[#234e72]">
                                    ₹{groupingResult.tripBlock.estimatedEarnings} Earnings · {groupingResult.groupedOrdersCount} Orders Batched
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {groupingResult.orders.map((o: any, idx: number) => (
                                    <div key={idx} className="p-2 rounded-lg bg-white border border-[#e5e1da] text-[11px]">
                                        <div className="flex justify-between font-mono font-bold text-[#1c1e24]">
                                            <span>{o.code}</span>
                                            <span>{o.quantity} kg</span>
                                        </div>
                                        <p className="text-[#8c8e96] text-[10px]">{o.farmerName} ({o.village})</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SCENARIO 3: SHOP COMPETITION (ATOMIC CONCURRENCY)
                ══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-[#e5e1da] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-lg bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc] flex items-center justify-center font-bold text-xs">
                                    3
                                </span>
                                <h3 className={`${cormorant.className} text-xl font-bold text-[#1c1e24]`}>
                                    Scenario 3 — Shop Competition (Atomic Concurrency)
                                </h3>
                            </div>
                            <p className="text-xs text-[#5a5f6b] mt-1">
                                Shop A, Shop B, Shop C Simultaneous Claim ➔ 1 Winner (200 OK) ➔ 2 Conflicts (409 Conflict) ➔ Status: CLAIMED
                            </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#faf8f5] text-[#8c8e96] border border-[#e5e1da]">
                            claimTripService.js
                        </span>
                    </div>

                    {/* 3 Shop Cards Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                            <p className="text-[10px] font-bold text-[#c26d40] uppercase">Retail Shop A</p>
                            <p className="text-xs font-bold text-[#1c1e24] mt-0.5">Kisan Krishi Kendra</p>
                            <p className="text-[10px] text-[#8c8e96]">Rampura Hub</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                            <p className="text-[10px] font-bold text-[#234e72] uppercase">Retail Shop B</p>
                            <p className="text-xs font-bold text-[#1c1e24] mt-0.5">Green Valley Agro Store</p>
                            <p className="text-[10px] text-[#8c8e96]">Kolar Corridor</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#e5e1da]">
                            <p className="text-[10px] font-bold text-[#1f6e48] uppercase">Retail Shop C</p>
                            <p className="text-xs font-bold text-[#1c1e24] mt-0.5">Mohan Agro Mart</p>
                            <p className="text-[10px] text-[#8c8e96]">Bhopal South</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleRunShopCompetition}
                            disabled={competitionLoading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1f6e48] text-white hover:bg-[#165235] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {competitionLoading ? "Simulating Concurrent Claims…" : "▶ Execute 3 Concurrent Claims"}
                        </button>
                    </div>

                    {/* Competition Result */}
                    {competitionResult && (
                        <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e5e1da] space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-[#e5e1da] pb-2">
                                <span className="text-xs font-bold text-[#1c1e24]">
                                    Trip: {competitionResult.tripCode}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                                    Canonical Status: {competitionResult.finalLifecycleStatus}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                {/* Winner */}
                                <div className="p-3 rounded-xl bg-[#eef7f2] border border-[#a8d8bc]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase text-[#1f6e48]">Winner</span>
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white text-[#1f6e48] border border-[#a8d8bc]">
                                            HTTP {competitionResult.winner.httpStatus}
                                        </span>
                                    </div>
                                    <p className="font-bold text-[#1c1e24] mt-1">{competitionResult.winner.shopName}</p>
                                    <p className="text-[10px] text-[#1f6e48] mt-0.5 font-medium">Claim Confirmed (CLAIMED)</p>
                                </div>

                                {/* Rejected 1 & 2 */}
                                {competitionResult.rejectedShops.map((rej: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-[#fff5f5] border border-[#f0b0b0]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase text-[#902020]">Rejected</span>
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white text-[#902020] border border-[#f0b0b0]">
                                                HTTP {rej.httpStatus}
                                            </span>
                                        </div>
                                        <p className="font-bold text-[#1c1e24] mt-1">{rej.shopName}</p>
                                        <p className="text-[10px] text-[#902020] mt-0.5">{rej.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SCENARIO 4: REAL-TIME NOTIFICATION CASCADE
                ══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-[#e5e1da] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-lg bg-[#fff8f2] text-[#c26d40] border border-[#f5d5b8] flex items-center justify-center font-bold text-xs">
                                    4
                                </span>
                                <h3 className={`${cormorant.className} text-xl font-bold text-[#1c1e24]`}>
                                    Scenario 4 — Real-Time Shopkeeper Notification
                                </h3>
                            </div>
                            <p className="text-xs text-[#5a5f6b] mt-1">
                                Trip Created ➔ EventBus ➔ notificationListeners.js ➔ MongoDB Notification ➔ Live Socket.IO Push
                            </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#faf8f5] text-[#8c8e96] border border-[#e5e1da]">
                            notificationService.js
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-[#5a5f6b]">
                            Triggers a genuine trip broadcast that cascades through the EventBus and appears in the drawer without page reload.
                        </div>
                        <button
                            type="button"
                            onClick={handleRunRealtimeNotification}
                            disabled={realtimeLoading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c26d40] text-white hover:bg-[#a0510a] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {realtimeLoading ? "Broadcasting…" : "▶ Trigger Real-Time Notification"}
                        </button>
                    </div>

                    {/* Notification Feed */}
                    {liveNotifications.length > 0 && (
                        <div className="space-y-2 animate-fadeIn">
                            <p className="text-[10px] font-bold uppercase text-[#8c8e96]">Live Socket.IO Stream ({liveNotifications.length} Events)</p>
                            {liveNotifications.slice(0, 3).map((n, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-white border border-[#e5e1da] flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">🔔</span>
                                        <div>
                                            <p className="font-bold text-[#1c1e24]">{n.title}</p>
                                            <p className="text-[11px] text-[#5a5f6b]">{n.message}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#8c8e96]">
                                        {new Date(n.occurredAt || Date.now()).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
