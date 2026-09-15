"use client";

import React from "react";
import Link from "next/link";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

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

export default function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Order",
      subtitle: "Voice & Text Ingestion",
      tag: "Farmer Interface",
      color: "#c26d40",
      bg: "#fff8f2",
      border: "#f5d5b8",
      description:
        "Farmers send simple voice notes or WhatsApp messages in regional dialects. No training, no complicated smartphone apps.",
      preview: {
        type: "audio-chat",
        sender: "Harish Patel (Sonipat)",
        message: "Need 4 bags urea fertilizer and 20kg tomato seed by Thursday morning.",
        time: "07:14 AM",
      },
    },
    {
      num: "02",
      title: "Understand",
      subtitle: "Agricultural AI Parsing",
      tag: "NLP Engine",
      color: "#3a4fa0",
      bg: "#f2f4ff",
      border: "#c8d0f5",
      description:
        "FarmLink's AI interprets vernacular dialects, identifying products, quantities, coordinates, and urgency into structured JSON orders.",
      preview: {
        type: "structured-card",
        extracted: [
          { label: "Items", val: "4x Urea Fertilizer (200kg)" },
          { label: "Produce", val: "20kg Hybrid Tomato Seed" },
          { label: "Corridor", val: "Sonipat - Murthal Road" },
        ],
      },
    },
    {
      num: "03",
      title: "Group",
      subtitle: "Geo-clustering Corridors",
      tag: "Logistics Optimization",
      color: "#8a5a00",
      bg: "#fdf5e8",
      border: "#f5cc7a",
      description:
        "Nearby orders along the same transit arterial are automatically bundled into a single high-efficiency TripBlock, eliminating empty runs.",
      preview: {
        type: "trip-stats",
        code: "TB-2026-N4",
        ordersMerged: 4,
        savings: "48% reduced travel time",
      },
    },
    {
      num: "04",
      title: "Match",
      subtitle: "Decentralized Shop Claiming",
      tag: "Shopkeeper Hub",
      color: "#1f6e48",
      bg: "#eef7f2",
      border: "#a8d8bc",
      description:
        "Local agri-retailers and village store owners browse and claim available TripBlocks with guaranteed transparent profit margins and lock safety.",
      preview: {
        type: "shop-claim",
        shopName: "Kisan Seva Kendra",
        status: "Claimed & Locked",
        eta: "Scheduled: 2:00 PM",
      },
    },
    {
      num: "05",
      title: "Deliver",
      subtitle: "Unified Shared Journey",
      tag: "Fulfillment",
      color: "#234e72",
      bg: "#edf4fb",
      border: "#a8c8e8",
      description:
        "One consolidated vehicle journey satisfies multiple farm requests in sequence, cutting regional logistics emissions and overhead.",
      preview: {
        type: "delivery-progress",
        stops: ["Warehouse", "Farm A", "Farm B", "Farm C"],
        completed: "3 of 4 stops completed",
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#e5e1da]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#faf8f5] border border-[#e5e1da] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f6e48]" />
            <span
              className={`${jakarta.className} text-[11px] font-bold tracking-wider uppercase text-[#1f6e48]`}
            >
              The 5-Stage Core Workflow
            </span>
          </div>
          <h2
            className={`${cormorant.className} text-3xl sm:text-5xl font-medium text-[#1c1e24] tracking-tight leading-tight`}
          >
            Intelligent logistics from <span className="italic">soil to store.</span>
          </h2>
          <p
            className={`${jakarta.className} text-sm sm:text-base text-[#5a5f6b] mt-4 font-light leading-relaxed`}
          >
            Every order transitions effortlessly from a farmer's voice message to
            a consolidated local delivery.
          </p>
        </div>

        {/* 5-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, idx) => (
            <div
              key={step.num}
              className={`editorial-card p-6 sm:p-7 flex flex-col justify-between ${
                idx === 4 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className={`${cormorant.className} text-3xl font-bold`}
                    style={{ color: step.color }}
                  >
                    {step.num}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                    style={{
                      background: step.bg,
                      color: step.color,
                      border: `1px solid ${step.border}`,
                    }}
                  >
                    {step.tag}
                  </span>
                </div>

                <h3
                  className={`${cormorant.className} text-2xl font-semibold text-[#1c1e24] leading-snug`}
                >
                  {step.title}
                </h3>
                <p
                  className={`${jakarta.className} text-xs font-semibold text-[#8c8e96] uppercase tracking-wide mt-0.5 mb-3`}
                >
                  {step.subtitle}
                </p>

                <p
                  className={`${jakarta.className} text-xs sm:text-sm text-[#5a5f6b] font-normal leading-relaxed`}
                >
                  {step.description}
                </p>
              </div>

              {/* Visual Preview Box */}
              <div
                className="mt-6 p-3.5 rounded-xl border text-xs"
                style={{
                  background: step.bg,
                  borderColor: step.border,
                }}
              >
                {step.preview.type === "audio-chat" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#1c1e24]">
                      <span>{step.preview.sender}</span>
                      <span className="text-[#8c8e96]">{step.preview.time}</span>
                    </div>
                    <p className="text-[11px] text-[#5a5f6b] italic bg-white/70 p-2 rounded border border-[#f0ece6]">
                      &ldquo;{step.preview.message}&rdquo;
                    </p>
                  </div>
                )}

                {step.preview.type === "structured-card" && (
                  <div className="space-y-1 text-[11px]">
                    {step.preview.extracted?.map((item, i) => (
                      <div key={i} className="flex justify-between py-0.5 border-b border-black/5 last:border-0">
                        <span className="font-medium text-[#8c8e96]">{item.label}:</span>
                        <span className="font-semibold text-[#1c1e24]">{item.val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {step.preview.type === "trip-stats" && (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#8a5a00]">{step.preview.code}</span>
                      <span className="bg-white px-2 py-0.5 rounded font-medium text-[#1c1e24] border border-[#f5cc7a]">
                        {step.preview.ordersMerged} Orders Grouped
                      </span>
                    </div>
                    <p className="text-[#5a5f6b] text-[10px]">{step.preview.savings}</p>
                  </div>
                )}

                {step.preview.type === "shop-claim" && (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#1f6e48]">{step.preview.shopName}</span>
                      <span className="bg-[#1f6e48] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {step.preview.status}
                      </span>
                    </div>
                    <p className="text-[#5a5f6b] text-[10px]">{step.preview.eta}</p>
                  </div>
                )}

                {step.preview.type === "delivery-progress" && (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-[#234e72]">
                      <span>Active Route</span>
                      <span>{step.preview.completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {step.preview.stops?.map((stop, i) => (
                        <div key={i} className="flex-1 text-center py-1 bg-white rounded text-[9px] font-bold text-[#234e72] border border-[#a8c8e8]">
                          {stop}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Strip */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-[#faf8f5] border border-[#e5e1da] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className={`${cormorant.className} text-xl sm:text-2xl font-semibold text-[#1c1e24]`}>
              Experience the entire workflow live in your browser
            </h4>
            <p className={`${jakarta.className} text-xs sm:text-sm text-[#5a5f6b]`}>
              Step through live scenarios from WhatsApp intake to interactive map delivery dispatch.
            </p>
          </div>
          <Link
            href="/demo"
            className={`${jakarta.className} px-6 py-3 rounded-xl font-bold text-xs text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0`}
            style={{ background: "#c26d40" }}
          >
            Launch Interactive Demo →
          </Link>
        </div>
      </div>
    </section>
  );
}
