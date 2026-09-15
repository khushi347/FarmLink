"use client";

import React from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import LandingNav from "@/components/landing/LandingNav";
import CinematicHero from "@/components/landing/CinematicHero";
import NetworkVisualStory from "@/components/landing/NetworkVisualStory";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import LogisticsSimulationPreview from "@/components/landing/LogisticsSimulationPreview";
import EcosystemPortals from "@/components/landing/EcosystemPortals";
import LandingFooter from "@/components/landing/LandingFooter";

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

export default function LandingPage() {
  return (
    <div
      className={`min-h-screen bg-[#faf8f5] text-[#1c1e24] ${jakarta.className} selection:bg-[#c26d40] selection:text-white flex flex-col`}
    >
      {/* Top Navigation */}
      <LandingNav />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Cinematic Hero Section */}
        <CinematicHero />

        {/* 2. Visual Story: Network Pipeline (Farmers -> AI -> Grouping -> TripBlock -> Shop -> Delivery) */}
        <NetworkVisualStory />

        {/* 3. 5-Stage Core Workflow (Order, Understand, Group, Match, Deliver) */}
        <HowItWorksSection />

        {/* 4. Interactive Corridor Consolidation Simulator */}
        <LogisticsSimulationPreview />

        {/* 5. Application Gateways (Demo, Shopkeeper, Admin, Login) */}
        <EcosystemPortals />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
