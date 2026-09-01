"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
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
} from "@/components/Icons";

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
};

const LIVE_STATUSES = new Set(["NEW", "IN DELIVERY", "AVAILABLE TO SHOPS"]);

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
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actFilter, setActFilter] = useState("ALL");
  const [claimedBlocks, setClaimedBlocks] = useState<Record<string, string>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(18);

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

  useEffect(() => {
    const t = setInterval(() => setLiveCount((n) => n + 1), 18000);
    return () => clearInterval(t);
  }, []);

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
  const activityItems: ActivityItem[] = [
    { id:"a1", itemRef:"WhatsApp Request", source:"Farmer Sanjay (Sonipat)",   category:"Tractor Service",       status:"AI PARSED",           updated:"2 min ago",  actionText:"Review" },
    { id:"a2", itemRef:"WhatsApp Request", source:"Narela Farmers Co-op",       category:"Seeds & Fertilizer",    status:"READY FOR GROUPING",  updated:"8 min ago",  actionText:"Group"  },
    { id:"a3", itemRef:"Order #FL-204",    source:"Panipat Supply Cluster",     category:"Agricultural Supplies", status:"ASSIGNED TO TRIPBLOCK",updated:"18 min ago", actionText:"View"   },
    { id:"a4", itemRef:"TripBlock TB-104", source:"Sonipat–Panipat Corridor",   category:"Seeds & Fertilizer",    status:"AVAILABLE TO SHOPS",  updated:"25 min ago", actionText:"View"   },
    { id:"a5", itemRef:"TripBlock TB-101", source:"Karnal Retail Hub",          category:"Groceries",             status:"CLAIMED",             updated:"42 min ago", actionText:"View"   },
    { id:"a6", itemRef:"WhatsApp Request", source:"Harvinder Singh (Rohtak)",   category:"Pesticides",            status:"NEEDS REVIEW",        updated:"55 min ago", actionText:"Review" },
    { id:"a7", itemRef:"Order #FL-198",    source:"Kisan Retail Mart",          category:"Groceries",             status:"IN DELIVERY",         updated:"1h ago",     actionText:"Track"  },
  ];

  const intakes: WhatsAppIntake[] = [
    {
      id:"w1", sender:"Farmer Sanjay", phone:"+91 98120 44102", timestamp:"08:14 AM",
      rawMessage:"Need tractor for 3-acre wheat field preparation tomorrow morning.",
      category:"Tractor Service", aiStatus:"AI PARSED", aiConfidence:98,
      parsed:{ item:"Tractor Field Preparation", qty:"3 Acres", location:"Sonipat Field Cluster 2", timing:"Tomorrow 08:00 AM" },
    },
    {
      id:"w2", sender:"Narela Farmers Co-op", phone:"+91 94162 88301", timestamp:"08:22 AM",
      rawMessage:"Need 20kg tomato seeds and 5 bags NPK fertilizer for allocation.",
      category:"Seeds & Fertilizer", aiStatus:"READY FOR GROUPING", aiConfidence:96,
      parsed:{ item:"Tomato Seeds + NPK Fertilizer", qty:"20kg + 5 Bags (250kg)", location:"Narela North Hub", timing:"Today Dispatch" },
    },
    {
      id:"w3", sender:"Gurpreet Store Co-op", phone:"+91 97291 55204", timestamp:"08:35 AM",
      rawMessage:"Need 30 bags wheat flour and groceries for retail shop.",
      category:"Grocery Supplies", aiStatus:"AI PARSED", aiConfidence:99,
      parsed:{ item:"Bulk Wheat Flour & Store Groceries", qty:"30 Bags (~1,500 kg)", location:"Karnal Retail Sector", timing:"Today Afternoon" },
    },
    {
      id:"w4", sender:"Harvinder Singh", phone:"+91 98120 77319", timestamp:"08:48 AM",
      rawMessage:"Need pesticide spray for cotton crop infestation near Rohtak.",
      category:"Pesticides", aiStatus:"NEEDS REVIEW", aiConfidence:74,
      parsed:{ item:"Cotton Crop Pest Control Spray", qty:"5 L (Concentrated)", location:"Rohtak Outer Fields", timing:"Urgent — Today" },
    },
  ];

  const orders: OrderRecord[] = [
    { id:"o1", code:"FL-ORD-204", customer:"Narela Farmers Co-op",  category:"Seeds & Fertilizer",   location:"Narela North Corridor",   itemDetails:"Tomato Seeds + NPK Fertilizer",        status:"READY FOR GROUPING",    created:"08:22 AM", quantity:"270 kg"   },
    { id:"o2", code:"FL-ORD-201", customer:"Farmer Sanjay",         category:"Tractor Service",       location:"Sonipat Field Cluster 2", itemDetails:"Tractor Land Prep (3 Acres)",           status:"AI PARSED",             created:"08:14 AM", quantity:"1 Service"},
    { id:"o3", code:"FL-ORD-198", customer:"Kisan Retail Mart",     category:"Grocery Supplies",      location:"Karnal Central",          itemDetails:"30 Bags Wheat Flour + Groceries",       status:"ASSIGNED TO TRIPBLOCK", created:"07:55 AM", quantity:"1,500 kg" },
    { id:"o4", code:"FL-ORD-195", customer:"Harvinder Singh",       category:"Pesticides",            location:"Rohtak Outer Fields",     itemDetails:"Cotton Crop Spray Treatment",           status:"NEEDS REVIEW",          created:"08:48 AM", quantity:"5 L"      },
  ];

  const tripblocks: TripBlockRecord[] = [
    { id:"t1", code:"TB-104", orderCount:2, categoryItems:"Seeds & Fertilizer",              corridor:"Sonipat → Panipat Retail Corridor", weightQuantity:"450 kg",   claimStatus:"AVAILABLE TO SHOPS", deadlineMinutes:28, orders:["FL-ORD-204","FL-ORD-199"] },
    { id:"t2", code:"TB-101", orderCount:1, categoryItems:"Store Groceries & Bulk Flour",    corridor:"Karnal Retail Corridor",            weightQuantity:"1,500 kg", claimStatus:"CLAIMED",            claimedByShop:"Green Valley Store (Panipat)", orders:["FL-ORD-198"] },
    { id:"t3", code:"TB-098", orderCount:2, categoryItems:"Agricultural Pesticides & Tools", corridor:"Rohtak Hub Corridor",               weightQuantity:"320 kg",   claimStatus:"IN DELIVERY",        claimedByShop:"Mohan Agro Mart (Karnal)",     orders:["FL-ORD-189","FL-ORD-185"] },
  ];

  const attention = [
    { text:"Duplicate WhatsApp request from Farmer Rajveer — needs resolution",      urgency:"high"   },
    { text:"Order FL-ORD-201 has an incomplete audio note — unit spec missing",       urgency:"medium" },
    { text:"TripBlock TB-104 claim deadline approaching — 28 minutes remaining",      urgency:"high"   },
    { text:"Pesticide request from Rohtak requires coordinator review before grouping",urgency:"medium" },
  ];

  const filteredActivity = activityItems.filter((a) => {
    if (actFilter === "WHATSAPP")  return a.itemRef.includes("WhatsApp");
    if (actFilter === "ORDERS")    return a.itemRef.includes("Order");
    if (actFilter === "TRIPBLOCKS")return a.itemRef.includes("TripBlock");
    return true;
  });

  const metrics = [
    { label:"WhatsApp Requests",   val:String(liveCount), sub:"+4 this hour",        accent:"#c26d40", live:true  },
    { label:"Ready for Grouping",  val:"7",               sub:"1,420 kg pending",    accent:"#c26d40", live:false },
    { label:"TripBlocks Available",val:"4",               sub:"Open for claims",      accent:"#b84a0a", live:true  },
    { label:"Shop Claims Today",   val:"6",               sub:"Confirmed & locked",   accent:"#1f6e48", live:false },
    { label:"In Delivery",         val:"3",               sub:"Active shipments",     accent:"#234e72", live:true  },
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
                Here's what's happening across today's WhatsApp intakes, orders, and TripBlocks.
              </p>
            </div>

            {/* Compact workflow pipeline */}
            <div className="hidden xl:flex items-center gap-2">
              {[
                { label:"WhatsApp", n:liveCount, color:"#a0510a", bg:"#fff8f2", border:"#f5d5b8" },
                { label:"AI Parse", n:16,        color:"#3a4fa0", bg:"#f2f4ff", border:"#c8d0f5" },
                { label:"Orders",   n:12,        color:"#8a5a00", bg:"#fdf5e8", border:"#f5cc7a" },
                { label:"TripBlocks",n:6,        color:"#b84a0a", bg:"#fff4ec", border:"#f5c4a0" },
                { label:"Claimed",  n:6,         color:"#1f6e48", bg:"#eef7f2", border:"#a8d8bc" },
                { label:"Delivery", n:3,         color:"#234e72", bg:"#edf4fb", border:"#a8c8e8" },
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
                          <p className="text-[11px] font-light" style={{ color: "#c26d40" }}>4 items require action</p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: "#fff0e5", color: "#a0510a", border: "1px solid #f5d5b8" }}
                      >
                        4 Active
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
                        {["ALL", "WHATSAPP", "ORDERS", "TRIPBLOCKS"].map((c) => (
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
                      {[
                        { shop:"Green Valley Store", action:"Claimed TB-104 (Seeds & Fertilizer)", time:"12m ago" },
                        { shop:"Kisan General Store", action:"Viewed TB-204 (Agricultural Supplies)", time:"28m ago" },
                        { shop:"Mohan Agro Mart", action:"Completed pickup for TB-101", time:"1h ago" },
                        { shop:"Rural Retail Hub", action:"Placed store supply order #FL-204", time:"2h ago" },
                      ].map((a, i) => (
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
                        4 Available
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#f0ece6" }}>
                      {tripblocks.slice(0, 2).map((tb) => {
                        const claimed = claimedBlocks[tb.code] || tb.claimedByShop;
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
                    {[
                      { label:"TB-098 → Mohan Agro Mart", progress:80, color:"#426890" },
                      { label:"TB-101 → Green Valley Store", progress:40, color:"#426890" },
                    ].map((d) => (
                      <div key={d.label}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: "#3a3f47" }}>{d.label}</span>
                          <span className="text-[10px] font-bold" style={{ color: d.color }}>{d.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#e5e1da" }}>
                          <div className="h-full rounded-full progress-bar" style={{ width: `${d.progress}%`, background: d.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── WHATSAPP INTAKE ── */}
            {activeTab === "intake" && (
              <div className="page-enter space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="WhatsApp Intake"
                    subtitle="Incoming requests structured by FarmLink AI — tractor services, seeds, fertilizers, pesticides, and grocery supplies."
                  />
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-bold shrink-0"
                    style={{ background: "#fff8f2", color: "#a0510a", border: "1px solid #f5d5b8" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: "#c26d40" }} />
                    {liveCount} processed today
                  </div>
                </div>

                <div className="space-y-4">
                  {intakes.map((req, idx) => (
                    <div
                      key={req.id}
                      className="warm-card card-enter overflow-hidden"
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      {/* Card header */}
                      <div
                        className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                        style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-extrabold"
                            style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                          >
                            {req.sender.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: "#1c1e24" }}>{req.sender}</p>
                            <p className="text-[11px] font-light" style={{ color: "#8c8e96" }}>
                              {req.phone} · {req.timestamp}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CategoryTag cat={req.category} />
                          <StatusBadge status={req.aiStatus} />
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* WhatsApp message bubble */}
                        <div className="flex items-start gap-3">
                          <div
                            className="h-5 w-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                            style={{ background: "#25D366" }}
                          >
                            <WhatsAppIcon size={11} style={{ color: "#ffffff" }} />
                          </div>
                          <div
                            className="flex-1 rounded-xl rounded-tl-none px-4 py-3 text-xs font-light italic leading-relaxed"
                            style={{ background: "#f0fdf0", border: "1px solid #c8eacc", color: "#1c3a1c" }}
                          >
                            "{req.rawMessage}"
                          </div>
                        </div>

                        {/* AI structured output */}
                        <div
                          className="rounded-xl p-4 space-y-3"
                          style={{ background: "#f5f6ff", border: "1px solid #c8d0f5" }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#3a4fa0" }}>
                              <SparklesIcon size={11} style={{ color: "#3a4fa0" }} />
                              AI Interpretation
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-16 rounded-full overflow-hidden" style={{ background: "#c8d0f5" }}>
                                <div
                                  className="h-full rounded-full progress-bar"
                                  style={{ width: `${req.aiConfidence}%`, background: req.aiConfidence >= 90 ? "#426890" : "#d4a040" }}
                                />
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: req.aiConfidence >= 90 ? "#3a4fa0" : "#7a5d00" }}>
                                {req.aiConfidence}%
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label:"Parsed Item",     value:req.parsed.item },
                              { label:"Quantity / Scope",value:req.parsed.qty },
                              { label:"Location",        value:req.parsed.location },
                              { label:"Timing",          value:req.parsed.timing },
                            ].map((f) => (
                              <div key={f.label}>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: "#426890" }}>{f.label}</p>
                                <p className="text-xs font-semibold leading-snug" style={{ color: "#1c1e24" }}>{f.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          {req.aiStatus === "NEEDS REVIEW" ? (
                            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#a0510a" }}>
                              <AlertTriangleIcon size={11} /> Requires review
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#1f6e48" }}>
                              <CheckIcon size={11} /> Parsed successfully
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ color: "#5a5f6b" }}
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className="btn-terra px-3 py-1.5 rounded-lg text-xs font-bold"
                            >
                              Process into Order →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                            <button type="button" className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: "#5a5f6b" }}>
                              Manage
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
                    4 open for claims
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tripblocks.map((tb, idx) => {
                    const claimed = claimedBlocks[tb.code] || tb.claimedByShop;
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

                          {/* Claim zone */}
                          {claimed ? (
                            <div
                              className="px-3 py-2.5 rounded-lg text-xs font-semibold"
                              style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                            >
                              ✓ Claimed by: {claimed}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {tb.deadlineMinutes && (
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
                              )}
                              <button
                                type="button"
                                onClick={() => setClaimedBlocks((p) => ({ ...p, [tb.code]: user.name }))}
                                className="btn-terra w-full py-2.5 rounded-lg text-xs font-bold"
                              >
                                Claim TripBlock for Shop
                              </button>
                            </div>
                          )}
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
                  title="Shop Directory"
                  subtitle="Retail stores enrolled in FarmLink to claim and fulfill regional TripBlocks."
                />
                <div className="warm-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e1da", background: "#faf8f5" }}>
                        {["Shop Name", "Corridor", "Active Claims", "Status"].map((h) => (
                          <th key={h} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#b0b3bc" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name:"Green Valley Store",  location:"Panipat Sector 11 Corridor", claims:"TB-104, TB-101", count:2 },
                        { name:"Kisan General Store", location:"Sonipat Main Corridor",       claims:"TB-204",         count:1 },
                        { name:"Mohan Agro Mart",     location:"Karnal Central Corridor",     claims:"TB-098",         count:1 },
                      ].map((shop, idx) => (
                        <tr
                          key={shop.name}
                          className="data-row card-enter"
                          style={{ borderBottom: "1px solid #f0ece6", animationDelay: `${idx * 60}ms` }}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                                style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                              >
                                {shop.name.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold" style={{ color: "#1c1e24" }}>{shop.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-light" style={{ color: "#5a5f6b" }}>{shop.location}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: "#1c1e24" }}>{shop.count} TripBlocks</span>
                              <span className="font-mono text-[10px]" style={{ color: "#8c8e96" }}>({shop.claims})</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: "#eef7f2", color: "#1f6e48", border: "1px solid #a8d8bc" }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3faa6e" }} />
                              Active Partner
                            </span>
                          </td>
                        </tr>
                      ))}
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
                  {[
                    { code:"TB-098", route:"Rohtak Hub → Mohan Agro Mart",      items:"320 kg · Pesticides & Tools",    progress:80, eta:"10:45 AM",
                      steps:["Grouped","Shop Claimed","Locked","In Transit","Delivered"] },
                    { code:"TB-101", route:"Karnal Hub → Green Valley Store",    items:"1,500 kg · Groceries & Flour",   progress:40, eta:"11:30 AM",
                      steps:["Grouped","Shop Claimed","Locked","In Transit","Delivered"] },
                  ].map((d, idx) => {
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
                              <StatusBadge status="IN DELIVERY" />
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

            {/* ── AI INSIGHTS ── */}
            {activeTab === "ai-insights" && (
              <div className="page-enter space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="AI Insights"
                    subtitle="How FarmLink's AI interprets WhatsApp messages — across tractor services, agricultural supplies, and grocery requests."
                  />
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold shrink-0"
                    style={{ background: "#f2f4ff", color: "#3a4fa0", border: "1px solid #c8d0f5" }}
                  >
                    <SparklesIcon size={12} /> 12 parsed today
                  </div>
                </div>

                {/* Summary tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label:"Avg Confidence", val:"94%", color:"#3a4fa0" },
                    { label:"Auto-Processed",  val:"16",  color:"#1f6e48" },
                    { label:"Needs Review",    val:"2",   color:"#a0510a" },
                    { label:"Parse Failures",  val:"0",   color:"#8c8e96" },
                  ].map((s, i) => (
                    <div key={s.label} className="warm-card card-enter p-4" style={{ animationDelay: `${i * 50}ms` }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8c8e96" }}>{s.label}</p>
                      <p className="text-2xl font-extrabold tracking-tight mt-1" style={{ color: s.color }}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Interpretation cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title:"Tractor Service", input:"Need tractor for 3-acre wheat field preparation tomorrow morning.", output:"Service: Field Prep · Location: Sonipat · Scope: 3 Acres", confidence:98 },
                    { title:"Seeds & Fertilizer", input:"Need 20kg tomato seeds and 5 bags NPK fertilizer.", output:"Items: Seeds + NPK · Qty: 270 kg · Dispatch: Today", confidence:96 },
                    { title:"Grocery Structuring", input:"Need 30 bags wheat flour and groceries for retail shop.", output:"Category: Bulk Groceries · Qty: 1,500 kg · Today Afternoon", confidence:99 },
                    { title:"Pesticides (Review)", input:"Need pesticide spray for cotton crop infestation near Rohtak.", output:"Category: Pesticides · Crop: Cotton · ⚠ Qty unspecified", confidence:74 },
                  ].map((ai, idx) => (
                    <div
                      key={idx}
                      className="warm-card card-enter p-5 space-y-3.5"
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold" style={{ color: "#1c1e24" }}>{ai.title}</h4>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-14 rounded-full overflow-hidden" style={{ background: "#e5e1da" }}>
                            <div
                              className="h-full rounded-full progress-bar"
                              style={{ width: `${ai.confidence}%`, background: ai.confidence >= 90 ? "#426890" : "#d4a040" }}
                            />
                          </div>
                          <span className="text-[10px] font-extrabold" style={{ color: ai.confidence >= 90 ? "#3a4fa0" : "#7a5d00" }}>
                            {ai.confidence}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: "#25D366" }}>
                          <WhatsAppIcon size={10} style={{ color: "#fff" }} />
                        </div>
                        <div
                          className="flex-1 text-xs font-light italic leading-relaxed rounded-xl rounded-tl-none px-3 py-2"
                          style={{ background: "#f0fdf0", border: "1px solid #c8eacc", color: "#1c3a1c" }}
                        >
                          "{ai.input}"
                        </div>
                      </div>

                      <div
                        className="flex items-start gap-2 text-xs font-semibold rounded-lg px-3 py-2.5"
                        style={{ background: "#f2f4ff", border: "1px solid #c8d0f5", color: "#3a4fa0" }}
                      >
                        <SparklesIcon size={11} style={{ color: "#426890", flexShrink: 0, marginTop: 1 }} />
                        <span>{ai.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
