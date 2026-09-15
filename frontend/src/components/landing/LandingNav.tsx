"use client";

import React, { useState, useEffect } from "react";
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

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-nav-scrolled py-3" : "glass-nav-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center focus:outline-none"
          aria-label="FarmLink Home"
        >
          <span
            className={`${cormorant.className} text-2xl sm:text-[26px] font-semibold tracking-tight transition-colors ${
              scrolled ? "text-[#1c1e24]" : "text-white drop-shadow-sm"
            }`}
          >
            FarmLink
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className={`hidden md:flex items-center gap-8 ${jakarta.className} text-xs font-medium tracking-wide`}
        >
          <a
            href="#how-it-works"
            className={`transition-colors hover:text-[#c26d40] ${
              scrolled ? "text-[#5a5f6b]" : "text-white/80 hover:text-white"
            }`}
          >
            How It Works
          </a>
          <a
            href="#network-journey"
            className={`transition-colors hover:text-[#c26d40] ${
              scrolled ? "text-[#5a5f6b]" : "text-white/80 hover:text-white"
            }`}
          >
            Network Journey
          </a>
          <a
            href="#live-simulator"
            className={`transition-colors hover:text-[#c26d40] ${
              scrolled ? "text-[#5a5f6b]" : "text-white/80 hover:text-white"
            }`}
          >
            Live Simulator
          </a>
          <a
            href="#portals"
            className={`transition-colors hover:text-[#c26d40] ${
              scrolled ? "text-[#5a5f6b]" : "text-white/80 hover:text-white"
            }`}
          >
            Ecosystem Portals
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className={`hidden md:flex items-center gap-3 ${jakarta.className}`}>
          <Link
            href="/shopkeeper"
            className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors ${
              scrolled
                ? "text-[#5a5f6b] hover:text-[#1c1e24] hover:bg-[#f4f1eb]"
                : "text-white/90 hover:text-white hover:bg-white/10"
            }`}
          >
            Shopkeeper Portal
          </Link>
          <Link
            href="/demo"
            className="text-xs font-bold px-4 py-2 rounded-lg text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 shadow-sm"
            style={{
              background: "#c26d40",
              boxShadow: "0 2px 10px rgba(194, 109, 64, 0.35)",
            }}
          >
            <span>Explore Demo</span>
            <svg
              className="w-3.5 h-3.5"
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
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-2 rounded-lg focus:outline-none transition-colors ${
            scrolled ? "text-[#1c1e24] bg-[#f4f1eb]" : "text-white bg-black/20 backdrop-blur-md"
          }`}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden px-6 pt-3 pb-6 border-b ${
            scrolled ? "bg-[#faf8f5] border-[#e5e1da]" : "bg-[#1c1e24]/95 backdrop-blur-xl border-white/10 text-white"
          } ${jakarta.className}`}
        >
          <nav className="flex flex-col gap-3.5 text-sm font-medium">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#c26d40] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#network-journey"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#c26d40] transition-colors"
            >
              Network Journey
            </a>
            <a
              href="#live-simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#c26d40] transition-colors"
            >
              Live Simulator
            </a>
            <a
              href="#portals"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#c26d40] transition-colors"
            >
              Ecosystem Portals
            </a>
            <hr className={scrolled ? "border-[#e5e1da]" : "border-white/10"} />
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/shopkeeper"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold py-2 text-center rounded-lg border border-[#e5e1da] dark:border-white/20"
              >
                Shopkeeper Portal
              </Link>
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold py-2.5 text-center rounded-lg text-white shadow-sm"
                style={{ background: "#c26d40" }}
              >
                Explore Demo
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
