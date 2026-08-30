"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // If user state is not resolved yet, return empty (AuthContext will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-zinc-950">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
            FarmLink
          </h1>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to FarmLink
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You have successfully logged in.
          </p>

          <div className="mt-6 space-y-4 border-t border-gray-100 pt-6 dark:border-zinc-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                User Name
              </span>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {user.name}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                User ID
              </span>
              <p className="font-mono text-sm text-gray-700 dark:text-zinc-300">
                {user.id}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Assigned Role
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
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
