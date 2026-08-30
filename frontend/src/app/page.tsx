"use client";

import React from "react";
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

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-[#faf8f5] text-[#1c1e24] ${jakarta.className}`}>
        <p className="text-lg font-medium text-stone-500">Loading...</p>
      </div>
    );
  }

  // If user state is not resolved yet, return empty (AuthContext will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className={`flex min-h-screen flex-col bg-[#faf8f5] text-[#1c1e24] ${jakarta.className}`}>
      {/* Navbar */}
      <header className="border-b border-[#e5e1da] bg-[#faf8f5] px-8 py-5">
        <div className="flex items-center justify-between">
          <h1 className={`${cormorant.className} text-2xl font-bold tracking-widest text-[#2c3e50]`}>
            FARMLINK
          </h1>
          <button
            onClick={logout}
            className="rounded-md border border-[#d6d1c7] bg-white px-4 py-2 text-xs font-bold tracking-wider uppercase text-stone-700 hover:bg-stone-50 transition-all focus:outline-hidden"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-[#e5e1da] bg-white p-10 shadow-sm">
          <h2 className={`${cormorant.className} text-4xl font-normal text-[#1c1e24]`}>
            Welcome back, {user.name.split(" ")[0]}
          </h2>
          <p className="mt-2 text-sm text-stone-500 font-light">
            You are logged in to the FarmLink logistics coordinate system.
          </p>

          <div className="mt-8 space-y-5 border-t border-[#f4f1eb] pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  Full Name
                </span>
                <p className="text-base font-semibold text-[#1c1e24] mt-0.5">
                  {user.name}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  Account ID
                </span>
                <p className="font-mono text-sm text-[#2c3e50] mt-0.5">
                  {user.id}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                Assigned Role
              </span>
              <div className="mt-1.5">
                <span className="inline-flex items-center rounded-full bg-[#f4f1eb] px-3 py-0.5 text-xs font-semibold text-[#c26d40] border border-[#e5e1da]">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
