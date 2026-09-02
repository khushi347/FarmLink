"use client";

import React from "react";
import { Cormorant_Garamond } from "next/font/google";
import { useAuth } from "@/context/AuthContext";
import { SettingsIcon, CheckIcon, ShieldIcon } from "@/components/Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export default function SettingsSection() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div>
        <h2 className={`${cormorant.className} text-2xl font-semibold tracking-wide text-[#1c1e24]`}>
          Hub Settings & Configuration
        </h2>
        <p className="text-xs text-[#8c8e96] font-light mt-0.5">
          Operational parameters and configuration for the FarmLink regional cooperative network.
        </p>
      </div>

      {/* Coordinator Account Card */}
      <div className="warm-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#f0ece6] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#faf2ed] border border-[#f0d8ca] flex items-center justify-center text-[#c26d40] font-bold text-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "FL"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1c1e24]">{user?.name}</h3>
              <p className="text-xs text-[#8c8e96] font-light">{user?.role === "admin" ? "Hub Coordinator" : "Retail Partner"}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
            Active Role
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-1">
              Account Role
            </span>
            <p className="font-semibold text-[#1c1e24]">{user?.role === "admin" ? "Regional Cooperative Coordinator" : "Retail Shopkeeper"}</p>
          </div>
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8c8e96] block mb-1">
              Assigned Region
            </span>
            <p className="font-semibold text-[#1c1e24]">North Regional Corridor (Sonipat / Panipat / Karnal)</p>
          </div>
        </div>
      </div>

      {/* Automated Aggregation Parameters */}
      <div className="warm-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#f0ece6] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#faf8f5] border border-[#e5e1da] flex items-center justify-center text-[#5a5f6b]">
              <SettingsIcon size={15} />
            </div>
            <h3 className="text-sm font-bold text-[#1c1e24]">Logistics & Aggregation Settings</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8c8e96] block">
              Grouping Window
            </span>
            <p className="text-lg font-bold text-[#1c1e24]">5 Hours</p>
            <p className="text-[10px] text-[#8c8e96]">Max delivery difference for auto-clustering</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8c8e96] block">
              Max Proximity Radius
            </span>
            <p className="text-lg font-bold text-[#1c1e24]">10 km</p>
            <p className="text-[10px] text-[#8c8e96]">Geographic threshold for TripBlock grouping</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e1da] space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8c8e96] block">
              Shop Claim Window
            </span>
            <p className="text-lg font-bold text-[#1c1e24]">60 Minutes</p>
            <p className="text-[10px] text-[#8c8e96]">First-come window for nearby retail claims</p>
          </div>
        </div>
      </div>

      {/* Automated WhatsApp Pipeline Status */}
      <div className="warm-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#f0ece6] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#eef7f2] border border-[#a8d8bc] flex items-center justify-center text-[#1f6e48]">
              <CheckIcon size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1c1e24]">Intake & AI Automation Status</h3>
              <p className="text-[11px] text-[#8c8e96] font-light">Internal background webhook pipeline</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: "#3faa6e" }} />
            Connected & Processing
          </span>
        </div>

        <div className="divide-y divide-[#f0ece6] text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#5a5f6b]">WhatsApp Twilio Webhook</span>
            <span className="font-semibold text-[#1c1e24] font-mono text-[11px]">/api/webhooks/whatsapp · 200 OK</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#5a5f6b]">Voice Transcription (Sarvam AI)</span>
            <span className="font-semibold text-[#1c1e24] font-mono text-[11px]">Active (Hindi / Hinglish / English)</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#5a5f6b]">Order Extraction (Gemini 2.5 Flash)</span>
            <span className="font-semibold text-[#1c1e24] font-mono text-[11px]">Active · 94% Avg Confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
