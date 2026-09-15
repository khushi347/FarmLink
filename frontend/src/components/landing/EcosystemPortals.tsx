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
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function EcosystemPortals() {
  const portals = [
    {
      title: "Interactive Live Demo",
      path: "/demo",
      badge: "Public Simulation",
      badgeBg: "#fff8f2",
      badgeText: "#a0510a",
      badgeBorder: "#f5d5b8",
      accent: "#c26d40",
      description:
        "Step through real-time WhatsApp intake simulation, AI parsing, dynamic TripBlock routing, and live shopkeeper claims on Leaflet map.",
      cta: "Launch Demo Simulation →",
      isPrimary: true,
      features: [
        "Live audio & text intake",
        "Geospatial corridor map",
        "TripBlock claim lifecycle",
      ],
    },
    {
      title: "Shopkeeper Portal",
      path: "/shopkeeper",
      badge: "Retail Partners",
      badgeBg: "#eef7f2",
      badgeText: "#1f6e48",
      badgeBorder: "#a8d8bc",
      accent: "#1f6e48",
      description:
        "Dedicated workspace for local retailers to browse available regional TripBlocks, lock delivery claims, and track cooperative revenue.",
      cta: "Open Shopkeeper Hub →",
      isPrimary: false,
      features: [
        "Available TripBlock queue",
        "Single-click claim & lock",
        "Transparent earnings ledger",
      ],
    },
    {
      title: "Coordinator Console",
      path: "/admin",
      badge: "Operations Hub",
      badgeBg: "#edf4fb",
      badgeText: "#234e72",
      badgeBorder: "#a8c8e8",
      accent: "#234e72",
      description:
        "Cooperative command center managing farmer registries, active retail stores, AI parsing exceptions, and regional dispatch health.",
      cta: "Enter Coordinator Console →",
      isPrimary: false,
      features: [
        "Live network metrics",
        "Regional customer registry",
        "Logistics & trip schedule",
      ],
    },
  ];

  return (
    <section id="portals" className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#e5e1da]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#faf8f5] border border-[#e5e1da] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c26d40]" />
            <span
              className={`${jakarta.className} text-[11px] font-bold tracking-wider uppercase text-[#a85a32]`}
            >
              Application Entry Points
            </span>
          </div>
          <h2
            className={`${cormorant.className} text-3xl sm:text-5xl font-medium text-[#1c1e24] tracking-tight leading-tight`}
          >
            Explore the <span className="italic">FarmLink ecosystem.</span>
          </h2>
          <p
            className={`${jakarta.className} text-sm sm:text-base text-[#5a5f6b] mt-4 font-light leading-relaxed`}
          >
            Direct access to public simulation environments, partner interfaces, and operational hubs.
          </p>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {portals.map((portal) => (
            <div
              key={portal.path}
              className={`editorial-card p-7 flex flex-col justify-between relative overflow-hidden ${
                portal.isPrimary ? "ring-2 ring-[#c26d40]/20" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                    style={{
                      background: portal.badgeBg,
                      color: portal.badgeText,
                      border: `1px solid ${portal.badgeBorder}`,
                    }}
                  >
                    {portal.badge}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: portal.accent }}
                  />
                </div>

                <h3
                  className={`${cormorant.className} text-2xl font-bold text-[#1c1e24] mb-3 leading-snug`}
                >
                  {portal.title}
                </h3>

                <p
                  className={`${jakarta.className} text-xs sm:text-sm text-[#5a5f6b] leading-relaxed mb-6 font-normal`}
                >
                  {portal.description}
                </p>

                {/* Feature bullets */}
                <ul className="space-y-2 mb-8">
                  {portal.features.map((f, i) => (
                    <li
                      key={i}
                      className={`${jakarta.className} text-xs text-[#5a5f6b] flex items-center gap-2`}
                    >
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: portal.accent }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={portal.path}
                className={`${jakarta.className} text-xs font-bold py-3 px-4 rounded-xl text-center transition-all ${
                  portal.isPrimary
                    ? "bg-[#c26d40] text-white hover:bg-[#a85a32] shadow-sm hover:shadow"
                    : "bg-[#faf8f5] text-[#1c1e24] hover:bg-[#f4f1eb] border border-[#d6d1c7]"
                }`}
              >
                {portal.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
