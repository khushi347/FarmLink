"use client";

import React from "react";
import Link from "next/link";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

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

export default function LandingFooter() {
  return (
    <footer className="bg-[#14171a] text-[#d6d1c7] border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <span className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-white tracking-tight`}>
                FarmLink
              </span>
            </div>
            <p className={`${jakarta.className} text-xs text-[#8c8e96] max-w-sm leading-relaxed`}>
              Bridging rural farmers and local shops through AI-assisted voice ordering,
              smart corridor grouping, and shared delivery logistics.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#8c8e96]">
              <span className="w-2 h-2 rounded-full bg-[#1f6e48] live-dot" />
              <span>Decentralized Agrarian Logistics Protocol</span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className={`${jakarta.className} text-xs font-bold uppercase tracking-wider text-white`}>
              Workflow & Network
            </h4>
            <ul className={`${jakarta.className} space-y-2 text-xs text-[#8c8e96]`}>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#network-journey" className="hover:text-white transition-colors">
                  Network Journey
                </a>
              </li>
              <li>
                <a href="#live-simulator" className="hover:text-white transition-colors">
                  Corridor Simulator
                </a>
              </li>
              <li>
                <a href="#portals" className="hover:text-white transition-colors">
                  Ecosystem Portals
                </a>
              </li>
            </ul>
          </div>

          {/* Application Portals */}
          <div className="md:col-span-4 space-y-3">
            <h4 className={`${jakarta.className} text-xs font-bold uppercase tracking-wider text-white`}>
              Application Gateways
            </h4>
            <ul className={`${jakarta.className} space-y-2 text-xs text-[#8c8e96]`}>
              <li>
                <Link href="/demo" className="hover:text-[#c26d40] text-white/90 font-medium transition-colors">
                  → Public Interactive Simulation Demo
                </Link>
              </li>
              <li>
                <Link href="/shopkeeper" className="hover:text-white transition-colors">
                  Shopkeeper Workspace
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Coordinator Command Console
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Clean Disclaimer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8c8e96]">
          <p className={jakarta.className}>
            © {new Date().getFullYear()} FarmLink. Dedicated to connected rural commerce.
          </p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors">Rural Logistics Intelligence</span>
            <span className="hover:text-white transition-colors">Open Agrarian Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
