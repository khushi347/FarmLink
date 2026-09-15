"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

export default function CinematicHero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-[92vh] sm:min-h-screen flex items-center justify-center overflow-hidden bg-[#14171a] text-white pt-24 pb-16">
      {/* ── CINEMATIC LAYERED BACKGROUND ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Farmland Sunrise Layer */}
        <div className="absolute inset-0 w-full h-full animate-hero-pan will-change-transform opacity-75">
          <Image
            src="/farmland_sunrise.png"
            alt="Rural farmland at dawn with agricultural fields and winding routes"
            fill
            priority
            className="object-cover object-center scale-105"
            sizes="100vw"
          />
        </div>

        {/* Terracotta/Earthy Ambient Overlay */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(194, 109, 64, 0.45) 0%, rgba(20, 23, 26, 0.95) 75%)",
          }}
        />

        {/* Vignette & Contrast Scrim to guarantee absolute headline legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(17, 19, 23, 0.65) 0%, rgba(20, 23, 26, 0.5) 40%, rgba(20, 23, 26, 0.92) 85%, #faf8f5 100%)",
          }}
        />

        {/* Ambient Mist Drift */}
        <div
          className="absolute -top-1/4 left-0 w-[200%] h-[150%] animate-mist pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 40%, rgba(244, 241, 235, 0.08) 0%, transparent 60%)",
          }}
        />

        {/* Subtle Animated Route Vector Traces over rural terrain */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Rural Corridor Line 1 */}
          <path
            d="M 120 780 C 320 650, 480 720, 720 540 C 960 360, 1140 460, 1380 290"
            fill="none"
            stroke="rgba(212, 139, 40, 0.45)"
            strokeWidth="2"
            className="animate-dash-flow"
          />
          {/* Rural Corridor Line 2 */}
          <path
            d="M 60 420 C 300 480, 560 310, 840 430 C 1120 550, 1260 380, 1420 490"
            fill="none"
            stroke="rgba(194, 109, 64, 0.4)"
            strokeWidth="1.5"
            className="animate-dash-flow"
            style={{ animationDuration: "28s" }}
          />
          {/* Subtle Nodes */}
          <circle cx="720" cy="540" r="4" fill="#c26d40" />
          <circle cx="720" cy="540" r="14" fill="none" stroke="rgba(194,109,64,0.3)" className="animate-pulse-glow" />
          <circle cx="320" cy="650" r="3" fill="#e59a42" />
          <circle cx="1140" cy="460" r="3" fill="#e59a42" />
        </svg>
      </div>

      {/* ── HERO CONTENT CONTAINER ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center">
        {/* Rural Ecosystem Badge */}
        <div
          className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8 border backdrop-blur-md transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderColor: "rgba(255, 255, 255, 0.18)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#e59a42] animate-pulse" />
          <span
            className={`${jakarta.className} text-[11px] font-semibold tracking-wider uppercase text-[#f4f1eb]`}
          >
            Intelligent Rural Agricultural Logistics
          </span>
          <span className="text-white/30 text-xs">•</span>
          <span
            className={`${jakarta.className} text-[11px] font-medium text-[#e5e1da] hidden sm:inline`}
          >
            The Countryside is Connected
          </span>
        </div>

        {/* Large Editorial Headline */}
        <h1
          className={`${cormorant.className} text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-medium tracking-tight text-white leading-[1.08] max-w-4xl transition-all duration-1000 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          From farm orders to{" "}
          <span
            className="italic font-normal"
            style={{
              background: "linear-gradient(135deg, #fcece2 0%, #e59a42 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            shared journeys.
          </span>
        </h1>

        {/* Grounded Subheadline */}
        <p
          className={`${jakarta.className} text-base sm:text-lg md:text-xl text-[#d6d1c7] max-w-2xl mt-6 sm:mt-7 font-light leading-relaxed transition-all duration-1000 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          FarmLink connects farmers, local shops, and nearby deliveries through
          AI-powered ordering and intelligent route consolidation.
        </p>

        {/* Call to Actions */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-4 mt-9 sm:mt-11 w-full sm:w-auto transition-all duration-1000 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            href="/demo"
            className={`${jakarta.className} w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg`}
            style={{
              background: "linear-gradient(135deg, #c26d40 0%, #a85a32 100%)",
              boxShadow: "0 6px 20px rgba(194, 109, 64, 0.4)",
            }}
          >
            <span>Explore FarmLink</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>

          <a
            href="#how-it-works"
            className={`${jakarta.className} w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-[#f4f1eb] bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2`}
          >
            <span>See How It Works</span>
            <svg
              className="w-4 h-4 text-[#d6d1c7]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </a>
        </div>

        {/* Key Metrics Quick Ribbon */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mt-14 sm:mt-18 pt-8 border-t border-white/10 max-w-3xl w-full text-left transition-all duration-1000 delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <p
              className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-white tracking-tight`}
            >
              45%+
            </p>
            <p
              className={`${jakarta.className} text-[11px] text-[#b0b3bc] font-medium mt-0.5`}
            >
              Transport Cost Reduction
            </p>
          </div>
          <div>
            <p
              className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-white tracking-tight`}
            >
              &lt; 30s
            </p>
            <p
              className={`${jakarta.className} text-[11px] text-[#b0b3bc] font-medium mt-0.5`}
            >
              Voice-to-Order AI Parsing
            </p>
          </div>
          <div>
            <p
              className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-white tracking-tight`}
            >
              100%
            </p>
            <p
              className={`${jakarta.className} text-[11px] text-[#b0b3bc] font-medium mt-0.5`}
            >
              Transparent Shop Margins
            </p>
          </div>
          <div>
            <p
              className={`${cormorant.className} text-2xl sm:text-3xl font-bold text-white tracking-tight`}
            >
              Zero
            </p>
            <p
              className={`${jakarta.className} text-[11px] text-[#b0b3bc] font-medium mt-0.5`}
            >
              Empty Return Kilometers
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
