"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export default function LoginPage() {
  const { login, error, clearError, isLoading, token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already logged in, wait for redirect
  if (isLoading || token) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-[#faf8f5] text-[#1c1e24] ${jakarta.className}`}>
        <div className="flex flex-col items-center gap-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c26d40] border-t-transparent"></div>
          <p className={`${cormorant.className} text-2xl italic font-light tracking-wide text-stone-600`}>
            Entering the portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-[#faf8f5] text-[#1c1e24] select-none overflow-hidden ${jakarta.className}`}>
      
      {/* Custom styles for animations & layout details */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flow {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-flow {
          stroke-dasharray: 6, 4;
          animation: flow 2.5s linear infinite;
        }
        @keyframes glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.98);
          }
          50% {
            opacity: 1.0;
            transform: scale(1.02);
          }
        }
        .animate-node-glow {
          transform-origin: center;
          animation: glow 4s ease-in-out infinite;
        }
        .reveal-1 {
          animation: revealEffect 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .reveal-2 {
          opacity: 0;
          animation: revealEffect 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
        }
        .reveal-3 {
          opacity: 0;
          animation: revealEffect 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        }
        @keyframes revealEffect {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />

      <div className="grid w-full grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Side: Immersive Editorial Canvas (Parchment & Sunlit fields) */}
        <div className="relative hidden flex-col justify-between p-16 lg:col-span-7 lg:flex xl:col-span-8 overflow-hidden bg-[#f4f1eb]">
          
          {/* Background image & warm morning mist vignette */}
          <div className="absolute inset-0 z-0 transition-transform duration-[12000ms] ease-out hover:scale-102">
            <Image
              src="/farmland_sunrise.png"
              alt="FarmLink Farmland Sunrise"
              fill
              priority
              className="object-cover opacity-60 filter sepia-[0.10] contrast-[1.04]"
            />
            {/* Linen wash & vignette: Blend of sky morning mist and warm parchment */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#f4f1eb] via-[#f4f1eb]/85 to-transparent z-10" />
            <div className="absolute inset-0 bg-[#faf8f5]/15 mix-blend-color z-10" />
          </div>

          {/* SVG Logistics Flow Overlay - Alabaster, Sienna & Cobalt coordinates */}
          <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Connections */}
            <path d="M150 150 L350 250 M350 250 L550 180 M350 250 L480 420 M480 420 L680 320" stroke="#8c8275" strokeWidth="1" strokeOpacity="0.25" />
            
            {/* Active flow streams in Cobalt Blue (routing) and Sienna (earth) */}
            <path className="animate-flow" d="M150 150 L350 250" stroke="#426890" strokeWidth="1.5" />
            <path className="animate-flow" d="M350 250 L550 180" stroke="#c26d40" strokeWidth="1.5" />
            <path className="animate-flow" d="M350 250 L480 420" stroke="#426890" strokeWidth="1.5" />
            <path className="animate-flow" d="M480 420 L680 320" stroke="#c26d40" strokeWidth="1.5" />
            
            {/* Nodes representing communities with text halos for perfect legibility */}
            <g className="animate-node-glow" style={{animationDelay: "0s"}}>
              <circle cx="150" cy="150" r="4.5" fill="#426890" />
              <circle cx="150" cy="150" r="10" stroke="#426890" strokeWidth="1.2" strokeOpacity="0.4" />
              <text x="140" y="132" fill="#2c3e50" fontSize="10" fontFamily="sans-serif" fontWeight="700" paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.3">Sanjay's Farm</text>
            </g>
            <g className="animate-node-glow" style={{animationDelay: "0.5s"}}>
              <circle cx="350" cy="250" r="5.5" fill="#c26d40" />
              <circle cx="350" cy="250" r="12" stroke="#c26d40" strokeWidth="1.2" strokeOpacity="0.4" />
              <text x="365" y="254" fill="#c26d40" fontSize="10" fontFamily="sans-serif" fontWeight="700" paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.3">FarmLink Hub</text>
            </g>
            <g className="animate-node-glow" style={{animationDelay: "1s"}}>
              <circle cx="550" cy="180" r="4.5" fill="#426890" />
              <circle cx="550" cy="180" r="10" stroke="#426890" strokeWidth="1.2" strokeOpacity="0.4" />
              <text x="565" y="184" fill="#2c3e50" fontSize="10" fontFamily="sans-serif" fontWeight="700" paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.3">Agri-Cooperative Shop</text>
            </g>
            <g className="animate-node-glow" style={{animationDelay: "1.5s"}}>
              <circle cx="480" cy="420" r="4.5" fill="#426890" />
              <circle cx="480" cy="420" r="10" stroke="#426890" strokeWidth="1.2" strokeOpacity="0.4" />
              <text x="430" y="445" fill="#2c3e50" fontSize="10" fontFamily="sans-serif" fontWeight="700" paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.3">Local Transport</text>
            </g>
            <g className="animate-node-glow" style={{animationDelay: "2s"}}>
              <circle cx="680" cy="320" r="6" fill="#c26d40" />
              <circle cx="680" cy="320" r="14" stroke="#c26d40" strokeWidth="1.2" strokeOpacity="0.4" />
              <text x="695" y="324" fill="#c26d40" fontSize="10" fontFamily="sans-serif" fontWeight="700" paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.3">Town Market</text>
            </g>
          </svg>

          {/* Brand Header */}
          <div className="relative z-30 reveal-1">
            <span className={`${cormorant.className} text-3xl font-bold tracking-widest text-[#1c1e24]`}>
              FARMLINK
            </span>
          </div>

          {/* Hero Typography Area */}
          <div className="relative z-30 max-w-xl space-y-6 select-text">
            <h2 className={`${cormorant.className} text-5xl xl:text-6xl font-light leading-[1.15] text-[#1c1e24] tracking-tight reveal-2`}>
              Connecting the hands <br/>
              that <span className="italic font-normal text-[#c26d40]">grow</span> with the shops that serve.
            </h2>
            <p className="text-base leading-relaxed text-[#3a3f47] font-light max-w-md reveal-3">
              We coordinate local harvest collections, independent retail shops, and delivery fleets through simple WhatsApp workflows to make agricultural logistics fast, fair, and reliable.
            </p>
          </div>

          {/* Footer Metadata */}
          <div className="relative z-30 flex justify-between border-t border-[#d6d1c7] pt-6 text-[10px] tracking-wider text-stone-500 uppercase font-semibold reveal-3">
            <div>Fields to Markets</div>
            <div>Bridging Rural & Retail Communities</div>
          </div>
        </div>

        {/* Right Side: The Access Panel (Clean Warm Alabaster) */}
        <div className="flex flex-col justify-between p-8 md:p-12 lg:col-span-5 xl:col-span-4 bg-[#faf8f5] relative z-20 border-l border-[#e5e1da]">
          
          {/* Mobile Brand Header */}
          <div className="flex items-center justify-between lg:hidden mb-12">
            <span className={`${cormorant.className} text-2xl font-bold tracking-widest text-[#c26d40]`}>
              FARMLINK
            </span>
            <span className="text-[10px] tracking-widest text-stone-500 uppercase font-semibold">Partner Portal</span>
          </div>

          <div className="hidden lg:block" />

          {/* Login Interface Panel */}
          <div className="w-full max-w-sm mx-auto my-auto space-y-10">
            <div className="space-y-3">
              <h1 className={`${cormorant.className} text-4xl font-normal tracking-wide text-[#1c1e24]`}>
                Sign In
              </h1>
              <p className="text-xs text-stone-500 font-light tracking-wide leading-relaxed">
                Log in to coordinate your crop deliveries, manage store orders, or assign driver trips.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="email" 
                    className="text-[10px] font-bold tracking-wider uppercase text-stone-500"
                  >
                    Email Address / Username
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@farmlink.com"
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-[#d6d1c7] bg-white px-4 py-3 text-sm text-[#1c1e24] placeholder:text-stone-400 focus:border-[#c26d40] focus:outline-hidden focus:ring-1 focus:ring-[#c26d40]/30 transition-all duration-200 focus:shadow-[0_2px_8px_rgba(194,109,64,0.06)]"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="password" 
                    className="text-[10px] font-bold tracking-wider uppercase text-stone-500"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-[#d6d1c7] bg-white px-4 py-3 text-sm text-[#1c1e24] placeholder:text-stone-400 focus:border-[#c26d40] focus:outline-hidden focus:ring-1 focus:ring-[#c26d40]/30 transition-all duration-200 focus:shadow-[0_2px_8px_rgba(194,109,64,0.06)]"
                  />
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="rounded-md bg-orange-50 border border-orange-200/50 p-3.5 animate-node-glow">
                  <div className="flex items-start gap-2.5">
                    <svg className="h-4.5 w-4.5 text-[#c26d40] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs font-light text-[#c26d40] leading-normal">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full relative flex items-center justify-center rounded-md bg-[#2c3e50] hover:bg-[#1a2633] px-4 py-3.5 text-xs font-bold tracking-widest uppercase text-white shadow-sm transition-all duration-300 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>

          {/* Footer Coordinates */}
          <div className="mt-12 text-center text-[10px] tracking-wider text-stone-500 uppercase lg:text-left">
            <span>Supporting local farming communities & independent retailers</span>
          </div>

        </div>
      </div>
    </div>
  );
}
