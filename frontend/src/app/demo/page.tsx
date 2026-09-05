"use client";

/**
 * FarmLink — Public Demo Page (/demo)
 * Module 13: Demo Simulation Layer
 *
 * A polished, public-facing page that walks any visitor through the
 * complete FarmLink workflow in real-time:
 *   Farmer WhatsApp request → AI processing → Order → TripBlock → Shop claim → Delivery
 *
 * Design: warm, clean, modern. Left panel = narrative timeline.
 * Right panel = live Leaflet map with real data from the backend.
 */

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { demoApi } from "@/lib/demoApi";
import { useDemoRealtime } from "@/hooks/useDemoRealtime";
import type { MapShop, MapOrder, MapTripBlock, MapFilterState, SelectedMapEntity } from "@/types/map";

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

// ── Dynamic Leaflet map import (no SSR) ───────────────────────────
const FarmLinkMap = dynamic(
    () => import("@/components/map/FarmLinkMap"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "#faf8f5" }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 rounded-full border-2 animate-spin" style={{ borderColor: "#c26d40", borderTopColor: "transparent" }} />
                    <p className="text-xs font-medium" style={{ color: "#8c8e96" }}>Loading map…</p>
                </div>
            </div>
        ),
    }
);

// ── Types ─────────────────────────────────────────────────────────
type StageKey =
    | "IDLE"
    | "FARMER_1_SUBMITTED"
    | "FARMER_2_SUBMITTED"
    | "FARMER_3_SUBMITTED"
    | "TRIPBLOCK_CREATED"
    | "SHOP_CLAIMED"
    | "DELIVERY_COMPLETED";

interface TimelineCard {
    id: string;
    type: "order" | "tripblock" | "claim" | "delivery";
    title: string;
    subtitle: string;
    detail: string;
    icon: string;
    accentColor: string;
    accentBg: string;
    timestamp: string;
}

// ── Stage metadata ────────────────────────────────────────────────
const STAGE_LABELS: Record<StageKey, string> = {
    IDLE: "Ready",
    FARMER_1_SUBMITTED: "Farmer 1",
    FARMER_2_SUBMITTED: "Farmer 2",
    FARMER_3_SUBMITTED: "Farmer 3",
    TRIPBLOCK_CREATED: "Grouped",
    SHOP_CLAIMED: "Claimed",
    DELIVERY_COMPLETED: "Delivered",
};

const STAGE_ORDER: StageKey[] = [
    "IDLE",
    "FARMER_1_SUBMITTED",
    "FARMER_2_SUBMITTED",
    "FARMER_3_SUBMITTED",
    "TRIPBLOCK_CREATED",
    "SHOP_CLAIMED",
    "DELIVERY_COMPLETED",
];

const stageIndex = (s: StageKey) => STAGE_ORDER.indexOf(s);

// ── Default map filter (show all layers) ─────────────────────────
const DEFAULT_FILTER: MapFilterState = {
    layer: "all",
    serviceType: "ALL",
    status: "ALL",
    searchQuery: "",
};

// ── Countdown helper ──────────────────────────────────────────────
function useCountdown(active: boolean, seconds: number, onExpire: () => void) {
    const [remaining, setRemaining] = useState(seconds);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setRemaining(seconds);
        if (!active) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return;
        }
        timerRef.current = setInterval(() => {
            setRemaining((r) => {
                if (r <= 1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    onExpire();
                    return seconds;
                }
                return r - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [active, seconds, onExpire]);

    return remaining;
}

// ── Main component ────────────────────────────────────────────────
export default function DemoPage() {
    // Session identity (UUID, persisted in sessionStorage for page refresh)
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Demo stage state
    const [stage, setStage] = useState<StageKey>("IDLE");
    const [isStepping, setIsStepping] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoAdvance, setAutoAdvance] = useState(true);
    const [mapKey, setMapKey] = useState(0);

    // Timeline feed
    const [cards, setCards] = useState<TimelineCard[]>([]);

    // Map data
    const [shops, setShops] = useState<MapShop[]>([]);
    const [orders, setOrders] = useState<MapOrder[]>([]);
    const [tripBlocks, setTripBlocks] = useState<MapTripBlock[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

    // Map expand for mobile
    const [mapExpanded, setMapExpanded] = useState(false);

    // Chat scroll ref for auto-scrolling to newest message
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // realtime
    const { status: realtimeStatus, subscribe } = useDemoRealtime(sessionId);

    // ── Session init ─────────────────────────────────────────────
    useEffect(() => {
        let sid: string | null = null;
        try {
            sid = sessionStorage.getItem("farmlink_demo_session");
        } catch {/* ignore */}

        if (!sid) {
            sid = crypto.randomUUID();
            try {
                sessionStorage.setItem("farmlink_demo_session", sid);
            } catch {/* ignore */}
        }
        setSessionId(sid);

        // Restore existing session state from backend
        demoApi.getStatus(sid).then((s) => {
            if (s.success) {
                setStage(s.stage as StageKey);
            }
        }).catch(() => {/* ignore */});
    }, []);

    // ── Fetch map data ────────────────────────────────────────────
    const refreshMap = useCallback(async () => {
        if (!sessionId) return;
        try {
            const res = await demoApi.getMapData(sessionId);
            if (res.success) {
                setShops(res.data.shops as MapShop[]);
                setOrders(res.data.orders as MapOrder[]);
                setTripBlocks(res.data.tripBlocks as MapTripBlock[]);
            }
        } catch {/* ignore */}
    }, [sessionId]);

    useEffect(() => {
        if (sessionId) refreshMap();
    }, [sessionId, refreshMap]);

    // ── Subscribe to demo realtime events ────────────────────────
    useEffect(() => {
        if (!sessionId) return;

        const unsubOrder = subscribe<Record<string, unknown>>("demo:order_submitted", (ev) => {
            const num = ev.orderNumber as number;
            const card: TimelineCard = {
                id: ev.eventId as string,
                type: "order",
                title: `${ev.farmerName} sent a request`,
                subtitle: `📲 WhatsApp message from ${ev.village}`,
                detail: `${(ev.products as Array<{ name: string; quantity: number; unit: string }>).map((p) => `${p.quantity} ${p.unit} ${p.name}`).join(", ")} · FarmLink AI parsed & confirmed · Order ${ev.orderCode} created`,
                icon: "📲",
                accentColor: "#c26d40",
                accentBg: "#fff8f2",
                timestamp: new Date(ev.occurredAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            };
            setCards((c) => [...c, card]);
            setStage(
                num === 1 ? "FARMER_1_SUBMITTED"
                    : num === 2 ? "FARMER_2_SUBMITTED"
                    : "FARMER_3_SUBMITTED"
            );
            refreshMap();
        });

        const unsubTrip = subscribe<Record<string, unknown>>("demo:tripblock_created", (ev) => {
            const card: TimelineCard = {
                id: ev.eventId as string,
                type: "tripblock",
                title: `TripBlock ${ev.tripCode} created`,
                subtitle: `🗂 ${ev.orderCount} nearby orders grouped automatically`,
                detail: `FarmLink aggregated ${ev.orderCount} Seeds requests into one delivery block. Nearby shops have been notified.`,
                icon: "🗂",
                accentColor: "#426890",
                accentBg: "#f0f5fb",
                timestamp: new Date(ev.occurredAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            };
            setCards((c) => [...c, card]);
            setStage("TRIPBLOCK_CREATED");
            refreshMap();
        });

        const unsubClaim = subscribe<Record<string, unknown>>("demo:trip_claimed", (ev) => {
            const card: TimelineCard = {
                id: ev.eventId as string,
                type: "claim",
                title: `${ev.shopName} claimed the trip`,
                subtitle: `🏪 Retail partner accepted TripBlock ${ev.tripCode}`,
                detail: `The shop has committed to fulfilling all orders in this block. Farmers will receive their supplies shortly.`,
                icon: "🏪",
                accentColor: "#1f6e48",
                accentBg: "#eef7f2",
                timestamp: new Date(ev.occurredAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            };
            setCards((c) => [...c, card]);
            setStage("SHOP_CLAIMED");
            refreshMap();
        });

        const unsubComplete = subscribe<Record<string, unknown>>("demo:trip_completed", (ev) => {
            const names = (ev.farmerNames as string[]).join(", ");
            const card: TimelineCard = {
                id: ev.eventId as string,
                type: "delivery",
                title: "Delivery complete ✅",
                subtitle: `${ev.orderCount} farmers received their ${ev.serviceType} supplies`,
                detail: `${names} — all orders fulfilled. FarmLink connected rural demand directly to a local supply partner.`,
                icon: "✅",
                accentColor: "#1a5e3a",
                accentBg: "#eef7f2",
                timestamp: new Date(ev.occurredAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            };
            setCards((c) => [...c, card]);
            setStage("DELIVERY_COMPLETED");
            refreshMap();
        });

        return () => {
            unsubOrder();
            unsubTrip();
            unsubClaim();
            unsubComplete();
        };
    }, [sessionId, subscribe, refreshMap]);

    // ── Auto-scroll chat to latest message ────────────────────────
    useEffect(() => {
        const el = chatScrollRef.current;
        if (!el) return;
        if (stage === "IDLE" && cards.length === 0) {
            el.scrollTop = 0;
            return;
        }
        const scrollToBottom = () => {
            el.scrollTo({
                top: el.scrollHeight,
                behavior: "smooth",
            });
        };
        scrollToBottom();
        const timer = setTimeout(scrollToBottom, 60);
        return () => clearTimeout(timer);
    }, [cards.length, stage]);

    // ── Step action ───────────────────────────────────────────────
    const isComplete = stage === "DELIVERY_COMPLETED";

    const handleStep = useCallback(async () => {
        if (!sessionId || isStepping || isComplete) return;
        setIsStepping(true);
        setError(null);
        try {
            await demoApi.runStep(sessionId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsStepping(false);
        }
    }, [sessionId, isStepping, isComplete]);

    // ── Auto-advance countdown ────────────────────────────────────
    const shouldAutoAdvance = autoAdvance && !isComplete && !isStepping && stage !== "IDLE";
    const countdown = useCountdown(shouldAutoAdvance, 4, handleStep);

    // ── Reset ─────────────────────────────────────────────────────
    const handleReset = useCallback(async () => {
        if (!sessionId || isResetting) return;
        setIsResetting(true);
        setError(null);
        try {
            await demoApi.reset(sessionId);
            setStage("IDLE");
            setCards([]);
            setOrders([]);
            setTripBlocks([]);
            setSelectedEntity(null);
            setMapKey((k) => k + 1);
            // Generate a fresh session so next run is truly clean
            const freshId = crypto.randomUUID();
            try { sessionStorage.setItem("farmlink_demo_session", freshId); } catch {/* */}
            setSessionId(freshId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Reset failed");
        } finally {
            setIsResetting(false);
        }
    }, [sessionId, isResetting]);

    // ── Progress stepper data ─────────────────────────────────────
    const currentIdx = stageIndex(stage);
    const progressSteps = [
        { label: "Farmer 1", icon: "📲" },
        { label: "Farmer 2", icon: "📲" },
        { label: "Farmer 3", icon: "📲" },
        { label: "TripBlock", icon: "🗂" },
        { label: "Claimed", icon: "🏪" },
        { label: "Delivered", icon: "✅" },
    ];

    // ── Realtime status pill ──────────────────────────────────────
    const realtimeColor = useMemo(() => {
        if (realtimeStatus === "connected") return "#3faa6e";
        if (realtimeStatus === "connecting" || realtimeStatus === "reconnecting") return "#d4a017";
        return "#aaaaaa";
    }, [realtimeStatus]);

    // ── Render ────────────────────────────────────────────────────
    return (
        <div
            className={`min-h-screen flex flex-col ${jakarta.className}`}
            style={{ background: "linear-gradient(135deg, #faf8f5 0%, #f2ede5 100%)" }}
        >
            {/* ── HEADER ── */}
            <header
                className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-8 h-14 shrink-0"
                style={{
                    background: "rgba(250, 248, 245, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid #e5e1da",
                }}
            >
                <div className="flex items-center gap-3">
                    <span
                        className={`${cormorant.className} text-[22px] font-bold tracking-[0.12em]`}
                        style={{ color: "#1c1e24" }}
                    >
                        FARMLINK
                    </span>
                    <span
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: "#fff4ec", color: "#b84a0a", border: "1px solid #f5c4a0" }}
                    >
                        Live Demo
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Realtime status */}
                    <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "#8c8e96" }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: realtimeColor }} />
                        {realtimeStatus === "connected" ? "Live" : realtimeStatus}
                    </span>

                    <Link
                        href="/login"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e5e1da",
                            color: "#5a5f6b",
                        }}
                    >
                        Coordinator →
                    </Link>
                </div>
            </header>

            {/* ── HERO ── */}
            <div className="px-5 sm:px-8 pt-8 pb-6 text-center">
                <h1
                    className={`${cormorant.className} text-[28px] sm:text-[38px] font-medium leading-tight tracking-wide`}
                    style={{ color: "#1c1e24" }}
                >
                    See FarmLink in Action
                </h1>
                <p className="mt-2 text-sm font-light max-w-lg mx-auto" style={{ color: "#8c8e96" }}>
                    Watch how a farmer's WhatsApp message becomes a coordinated rural delivery — automatically, in real time.
                </p>
            </div>

            {/* ── PROGRESS STEPPER ── */}
            <div className="px-5 sm:px-8 pb-5">
                <div className="max-w-2xl mx-auto flex items-center gap-0">
                    {progressSteps.map((step, i) => {
                        const done = currentIdx > i + 1;
                        const active = currentIdx === i + 1;
                        return (
                            <React.Fragment key={step.label}>
                                <div className="flex flex-col items-center gap-1 min-w-0">
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 shrink-0"
                                        style={{
                                            background: done
                                                ? "#1f6e48"
                                                : active
                                                ? "#c26d40"
                                                : "#ece8e0",
                                            color: done || active ? "#fff" : "#8c8e96",
                                            border: active ? "2px solid #c26d40" : "2px solid transparent",
                                            boxShadow: active ? "0 0 0 4px rgba(194,109,64,0.15)" : "none",
                                        }}
                                    >
                                        {done ? "✓" : active ? step.icon : step.icon}
                                    </div>
                                    <span
                                        className="text-[9px] font-bold text-center hidden sm:block"
                                        style={{ color: done ? "#1f6e48" : active ? "#c26d40" : "#aaa", maxWidth: 52 }}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {i < progressSteps.length - 1 && (
                                    <div
                                        className="flex-1 h-0.5 mx-1 transition-all duration-500"
                                        style={{ background: done ? "#1f6e48" : "#e5e1da" }}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* ── MAIN TWO-PANEL LAYOUT ── */}
            <div className="flex-1 px-4 sm:px-8 pb-8 flex flex-col lg:flex-row gap-5 max-w-7xl w-full mx-auto">

                {/* LEFT — Timeline panel */}
                <div
                    className="lg:w-[420px] shrink-0 flex flex-col rounded-2xl overflow-hidden h-[540px] lg:h-[580px]"
                    style={{ background: "#ffffff", border: "1px solid #e5e1da", boxShadow: "0 2px 24px rgba(28,30,36,0.04)" }}
                >
                    {/* Panel header */}
                    <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #e5e1da" }}>
                        <div>
                            <h2 className={`${cormorant.className} text-lg font-semibold`} style={{ color: "#1c1e24" }}>
                                The Journey
                            </h2>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: "#8c8e96" }}>
                                Real-time workflow events
                            </p>
                        </div>

                        {stage === "DELIVERY_COMPLETED" ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}>
                                ✅ Complete
                            </span>
                        ) : stage === "IDLE" ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: "#faf8f5", color: "#8c8e96", border: "1px solid #e5e1da" }}>
                                Ready to start
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold live-dot-parent" style={{ background: "#fff8f2", color: "#c26d40", border: "1px solid #f5d5b8" }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#c26d40", animation: "pulse 1.5s infinite" }} />
                                Running
                            </span>
                        )}
                    </div>

                    {/* Timeline feed */}
                    <div
                        ref={chatScrollRef}
                        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 chat-scroll-container"
                        style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: "#e5e1da transparent",
                        }}
                    >
                        {cards.length === 0 && stage === "IDLE" && (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                                <div
                                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl"
                                    style={{ background: "#fff8f2", border: "1px solid #f5d5b8" }}
                                >
                                    🌾
                                </div>
                                <p className={`${cormorant.className} text-base font-medium`} style={{ color: "#1c1e24" }}>
                                    Waiting for the first farmer
                                </p>
                                <p className="text-xs" style={{ color: "#8c8e96" }}>
                                    Click &ldquo;Start&rdquo; to begin the simulation
                                </p>
                            </div>
                        )}

                        {cards.map((card, idx) => (
                            <div
                                key={card.id}
                                className="rounded-xl p-4 transition-all"
                                style={{
                                    background: card.accentBg,
                                    borderLeft: `3px solid ${card.accentColor}`,
                                    border: `1px solid ${card.accentColor}22`,
                                    animation: "cardSlideIn 0.35s ease-out",
                                    animationDelay: `${idx * 0.05}s`,
                                    animationFillMode: "both",
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-xl shrink-0 mt-0.5">{card.icon}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold truncate" style={{ color: "#1c1e24" }}>
                                            {card.title}
                                        </p>
                                        <p className="text-[10px] font-medium mt-0.5" style={{ color: card.accentColor }}>
                                            {card.subtitle}
                                        </p>
                                        <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: "#5a5f6b" }}>
                                            {card.detail}
                                        </p>
                                        <p className="text-[9px] mt-1.5 font-semibold" style={{ color: "#aaa" }}>
                                            {card.timestamp}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Processing shimmer (between FARMER_3 and TRIPBLOCK) */}
                        {stage === "FARMER_3_SUBMITTED" && autoAdvance && (
                            <div
                                className="rounded-xl p-4"
                                style={{ background: "#f4f7fb", border: "1px solid #d8e6f0", animation: "pulse 2s infinite" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-sm" style={{ background: "#dce9f5" }}>
                                        ⚡
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold" style={{ color: "#426890" }}>FarmLink grouping orders…</p>
                                        <p className="text-[10px]" style={{ color: "#8c8e96" }}>Geographic proximity algorithm running</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="px-4 py-4 space-y-3 shrink-0" style={{ borderTop: "1px solid #e5e1da" }}>
                        {error && (
                            <p className="text-[10px] text-center font-medium" style={{ color: "#902020" }}>
                                {error}
                            </p>
                        )}

                        {/* Auto-advance countdown */}
                        {shouldAutoAdvance && !isComplete && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#faf8f5", border: "1px solid #e5e1da" }}>
                                <div
                                    className="h-4 w-4 rounded-full border-2 animate-spin shrink-0"
                                    style={{ borderColor: "#c26d40", borderTopColor: "transparent" }}
                                />
                                <p className="text-[10px] font-medium flex-1" style={{ color: "#5a5f6b" }}>
                                    Next stage in <strong style={{ color: "#c26d40" }}>{countdown}s</strong>
                                </p>
                                <button
                                    onClick={() => setAutoAdvance(false)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                                    style={{ color: "#8c8e96", border: "1px solid #e5e1da", background: "#fff" }}
                                >
                                    Pause
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {/* Main CTA — Start / Next */}
                            {!isComplete ? (
                                <button
                                    id="demo-next-btn"
                                    onClick={async () => {
                                        if (stage === "IDLE") setAutoAdvance(true);
                                        await handleStep();
                                    }}
                                    disabled={isStepping}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                                    style={{
                                        background: isStepping ? "#f0ece4" : "#c26d40",
                                        color: isStepping ? "#8c8e96" : "#ffffff",
                                        cursor: isStepping ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {isStepping ? (
                                        <>
                                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            Processing…
                                        </>
                                    ) : stage === "IDLE" ? (
                                        "▶ Start Demo"
                                    ) : (
                                        "▶ Next Stage"
                                    )}
                                </button>
                            ) : (
                                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}>
                                    ✅ Demo Complete!
                                </div>
                            )}

                            {/* Pause/Resume toggle (only visible mid-run) */}
                            {!isComplete && stage !== "IDLE" && !shouldAutoAdvance && (
                                <button
                                    onClick={() => setAutoAdvance(true)}
                                    className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                    style={{ background: "#ffffff", border: "1px solid #e5e1da", color: "#5a5f6b" }}
                                    title="Resume auto-advance"
                                >
                                    ▶ Auto
                                </button>
                            )}

                            {/* Reset button */}
                            <button
                                id="demo-reset-btn"
                                onClick={handleReset}
                                disabled={isResetting || (stage === "IDLE" && cards.length === 0)}
                                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    background: "#ffffff",
                                    border: "1px solid #e5e1da",
                                    color: isResetting ? "#aaa" : "#5a5f6b",
                                    cursor: isResetting ? "not-allowed" : "pointer",
                                }}
                                title="Reset demo"
                            >
                                {isResetting ? "…" : "⟳"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Map panel */}
                <div
                    className="flex-1 flex flex-col rounded-2xl overflow-hidden h-[540px] lg:h-[580px]"
                    style={{ background: "#ffffff", border: "1px solid #e5e1da", boxShadow: "0 2px 24px rgba(28,30,36,0.04)" }}
                >
                    {/* Map header */}
                    <div className="px-5 py-3.5 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #e5e1da" }}>
                        <div>
                            <h2 className={`${cormorant.className} text-lg font-semibold`} style={{ color: "#1c1e24" }}>
                                Live Map
                            </h2>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: "#8c8e96" }}>
                                Bhopal agricultural corridor · Seeds deliveries
                            </p>
                        </div>

                        {/* Legend pills */}
                        <div className="hidden sm:flex items-center gap-2 text-[9px] font-semibold">
                            {[
                                { label: "Farmer", color: "#c26d40" },
                                { label: "TripBlock", color: "#426890" },
                                { label: "Shop", color: "#1f6e48" },
                            ].map((l) => (
                                <span key={l.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#faf8f5", border: "1px solid #e5e1da", color: l.color }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                                    {l.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Leaflet map */}
                    <div className="flex-1 min-h-0">
                        <FarmLinkMap
                            key={mapKey}
                            shops={shops}
                            orders={orders}
                            tripBlocks={tripBlocks}
                            filters={DEFAULT_FILTER}
                            selectedEntity={selectedEntity}
                            onSelectEntity={setSelectedEntity}
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </div>

            {/* ── WORKFLOW EXPLAINER (below panels) ── */}
            <div className="px-5 sm:px-8 pb-10">
                <div className="max-w-4xl mx-auto">
                    <p className={`${cormorant.className} text-center text-sm italic mb-6`} style={{ color: "#aaa" }}>
                        How it works
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { icon: "📲", title: "WhatsApp Request", desc: "Farmer sends a voice or text message in their local language" },
                            { icon: "⚡", title: "AI Processing", desc: "FarmLink automatically parses the request into a structured order" },
                            { icon: "🗂", title: "Smart Grouping", desc: "Nearby orders are bundled into a TripBlock for efficient delivery" },
                            { icon: "🏪", title: "Shop Fulfilment", desc: "A local retail partner claims and delivers the bundled order" },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="rounded-xl p-4 text-center"
                                style={{ background: "#ffffff", border: "1px solid #e5e1da" }}
                            >
                                <div className="text-2xl mb-2">{item.icon}</div>
                                <p className="text-xs font-bold mb-1" style={{ color: "#1c1e24" }}>{item.title}</p>
                                <p className="text-[10px] leading-relaxed" style={{ color: "#8c8e96" }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes cardSlideIn {
                    from { opacity: 0; transform: translateX(-12px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.6; }
                }
                .chat-scroll-container::-webkit-scrollbar {
                    width: 5px;
                }
                .chat-scroll-container::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-scroll-container::-webkit-scrollbar-thumb {
                    background: #e5e1da;
                    border-radius: 9999px;
                }
                .chat-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #c26d4088;
                }
            `}</style>
        </div>
    );
}
