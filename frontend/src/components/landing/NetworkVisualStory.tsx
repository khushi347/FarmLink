"use client";

import React, { useState, useEffect } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface NetworkStep {
  id: string;
  stepNumber: string;
  title: string;
  subhead: string;
  icon: React.ReactNode;
  detail: string;
  badge: string;
  accentColor: string;
  statsLabel: string;
  statsValue: string;
}

const NETWORK_STEPS: NetworkStep[] = [
  {
    id: "farmers",
    stepNumber: "01",
    title: "Farmers in the Field",
    subhead: "Natural voice & text intake",
    badge: "Origin",
    accentColor: "#c26d40",
    statsLabel: "Daily Ingestion",
    statsValue: "WhatsApp & IVR",
    detail:
      "A farmer sends a simple WhatsApp voice note or message in local dialect ('Need 5 bags of DAP fertilizer and 2 bags mustard seed at Kheri village'). No complex apps required.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "ai-order",
    stepNumber: "02",
    title: "AI Order Structuring",
    subhead: "Instant crop & intent parsing",
    badge: "Processing",
    accentColor: "#3a4fa0",
    statsLabel: "Extraction Accuracy",
    statsValue: "99.4%",
    detail:
      "FarmLink's agricultural language model extracts crop items, quantities, weights, urgency, and GPS coordinates from natural phrasing into structured digital order tickets.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "grouping",
    stepNumber: "03",
    title: "Intelligent Grouping",
    subhead: "Geo-clustering along rural corridors",
    badge: "Consolidation",
    accentColor: "#8a5a00",
    statsLabel: "Corridor Radius",
    statsValue: "12 km corridors",
    detail:
      "Instead of single costly deliveries, nearby farm requests along identical rural road corridors are consolidated automatically into cohesive batch payloads.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "shared-trip",
    stepNumber: "04",
    title: "Shared TripBlock",
    subhead: "Multi-order unified logistics unit",
    badge: "Optimization",
    accentColor: "#b84a0a",
    statsLabel: "Load Efficiency",
    statsValue: "88% avg load",
    detail:
      "A single TripBlock aggregates weight, payout, optimal multi-stop itinerary, and scheduled delivery window ready for dispatch.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    id: "local-shop",
    stepNumber: "05",
    title: "Local Shop Matching",
    subhead: "Shopkeeper claim with lock protection",
    badge: "Fulfillment",
    accentColor: "#1f6e48",
    statsLabel: "Claim Protocol",
    statsValue: "First-Claim Lock",
    detail:
      "Participating rural retailers view available TripBlocks tailored to their vehicle capacity. Claiming a trip instantly locks it with transparent cooperative earnings.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "delivery",
    stepNumber: "06",
    title: "Coordinated Delivery",
    subhead: "One journey, multiple farms served",
    badge: "Completion",
    accentColor: "#234e72",
    statsLabel: "Fuel Savings",
    statsValue: "52% per run",
    detail:
      "The shopkeeper completes the shared circuit in a single run. Farmers receive notifications, orders are delivered on time, and rural commerce flourishes.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function NetworkVisualStory() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % NETWORK_STEPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const currentStep = NETWORK_STEPS[activeStepIndex];

  return (
    <section
      id="network-journey"
      className="relative py-20 sm:py-28 bg-[#faf8f5] border-b border-[#e5e1da] overflow-hidden"
    >
      {/* Subtle Contour Background Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,200 Q 360,120 720,220 T 1440,180"
            fill="none"
            stroke="#e5e1da"
            strokeWidth="1.2"
          />
          <path
            d="M 0,350 Q 360,420 720,320 T 1440,390"
            fill="none"
            stroke="#e5e1da"
            strokeWidth="1.2"
          />
          <path
            d="M 0,500 Q 450,560 900,470 T 1440,520"
            fill="none"
            stroke="#ede8df"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 sm:mb-18 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4f1eb] border border-[#e5e1da] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c26d40]" />
              <span
                className={`${jakarta.className} text-[11px] font-bold tracking-wider uppercase text-[#a85a32]`}
              >
                The Living Network
              </span>
            </div>
            <h2
              className={`${cormorant.className} text-3xl sm:text-5xl font-medium text-[#1c1e24] tracking-tight leading-tight`}
            >
              How orders become <span className="italic">shared journeys.</span>
            </h2>
          </div>
          <p
            className={`${jakarta.className} text-sm sm:text-base text-[#5a5f6b] max-w-md font-light leading-relaxed`}
          >
            A continuous loop connecting rural farmers, artificial intelligence,
            consolidated corridors, and local retailers.
          </p>
        </div>

        {/* ── INTERACTIVE JOURNEY PIPELINE TRACK ── */}
        <div className="relative mb-12">
          {/* Animated Connecting Vector Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-[3px] bg-[#e5e1da] z-0">
            <div
              className="h-full bg-[#c26d40] transition-all duration-500 ease-out"
              style={{
                width: `${(activeStepIndex / (NETWORK_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Step Selector Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
            {NETWORK_STEPS.map((step, idx) => {
              const isActive = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveStepIndex(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl transition-all duration-300 border text-left group ${
                    isActive
                      ? "bg-white border-[#c26d40] shadow-md -translate-y-1"
                      : "bg-[#ffffff]/80 hover:bg-white border-[#e5e1da] hover:border-[#d6d1c7]"
                  }`}
                >
                  {/* Step Icon Badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
                      isActive
                        ? "text-white shadow-sm ring-4 ring-[#c26d40]/15"
                        : isPast
                        ? "bg-[#f4f1eb] text-[#1c1e24]"
                        : "bg-[#faf8f5] text-[#8c8e96]"
                    }`}
                    style={{
                      background: isActive ? step.accentColor : undefined,
                    }}
                  >
                    {step.icon}
                  </div>

                  <span
                    className={`${jakarta.className} text-[10px] font-extrabold uppercase tracking-wider mb-1`}
                    style={{
                      color: isActive ? step.accentColor : "#8c8e96",
                    }}
                  >
                    Step {step.stepNumber}
                  </span>

                  <span
                    className={`${jakarta.className} text-xs font-bold leading-tight ${
                      isActive ? "text-[#1c1e24]" : "text-[#5a5f6b]"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── EXPANDED ACTIVE STEP INSPECTOR CARD ── */}
        <div
          className="bg-white rounded-2xl border border-[#e5e1da] p-6 sm:p-10 shadow-sm transition-all duration-500 relative overflow-hidden"
          style={{ borderLeft: `6px solid ${currentStep.accentColor}` }}
        >
          {/* Subtle watermark step number */}
          <div
            className={`absolute right-6 -bottom-6 ${cormorant.className} text-9xl font-bold text-[#faf8f5] select-none pointer-events-none`}
          >
            {currentStep.stepNumber}
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{ background: currentStep.accentColor }}
                >
                  {currentStep.badge}
                </span>
                <span
                  className={`${jakarta.className} text-xs font-medium text-[#8c8e96]`}
                >
                  Stage {currentStep.stepNumber} of 06
                </span>
              </div>

              <h3
                className={`${cormorant.className} text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1c1e24]`}
              >
                {currentStep.title} —{" "}
                <span className="italic font-normal text-[#5a5f6b]">
                  {currentStep.subhead}
                </span>
              </h3>

              <p
                className={`${jakarta.className} text-sm sm:text-base text-[#5a5f6b] font-normal leading-relaxed max-w-2xl`}
              >
                {currentStep.detail}
              </p>
            </div>

            <div className="lg:col-span-4 bg-[#faf8f5] rounded-xl p-5 border border-[#e5e1da] flex flex-col justify-between space-y-4">
              <div>
                <p
                  className={`${jakarta.className} text-[11px] font-semibold text-[#8c8e96] uppercase tracking-wider`}
                >
                  {currentStep.statsLabel}
                </p>
                <p
                  className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-[#1c1e24] mt-1`}
                >
                  {currentStep.statsValue}
                </p>
              </div>

              <div className="pt-3 border-t border-[#e5e1da] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`${jakarta.className} text-[11px] font-semibold text-[#5a5f6b] hover:text-[#1c1e24] flex items-center gap-1.5`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAutoPlaying ? "bg-[#1f6e48] live-dot" : "bg-[#8c8e96]"
                    }`}
                  />
                  {isAutoPlaying ? "Auto-advancing" : "Paused"}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStepIndex(
                        (prev) => (prev - 1 + NETWORK_STEPS.length) % NETWORK_STEPS.length
                      );
                      setIsAutoPlaying(false);
                    }}
                    className="w-7 h-7 rounded-lg border border-[#d6d1c7] bg-white flex items-center justify-center text-[#5a5f6b] hover:text-[#1c1e24]"
                    aria-label="Previous Step"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStepIndex(
                        (prev) => (prev + 1) % NETWORK_STEPS.length
                      );
                      setIsAutoPlaying(false);
                    }}
                    className="w-7 h-7 rounded-lg border border-[#d6d1c7] bg-white flex items-center justify-center text-[#5a5f6b] hover:text-[#1c1e24]"
                    aria-label="Next Step"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
