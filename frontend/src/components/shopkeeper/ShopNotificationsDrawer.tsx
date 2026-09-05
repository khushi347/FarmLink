"use client";

import React from "react";
import { ShopNotification } from "@/lib/api";
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

interface ShopNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ShopNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export default function ShopNotificationsDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: ShopNotificationsDrawerProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${jakarta.className}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1c1e24]/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#faf8f5] shadow-xl flex flex-col border-l border-[#e5e1da]">
          {/* Header */}
          <div className="p-6 bg-white border-b border-[#e5e1da] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`${cormorant.className} text-2xl font-semibold tracking-tight text-[#1c1e24]`}
                >
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff0e5] text-[#b84a0a] border border-[#f5c4a0]">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8c8e96] mt-0.5">
                Activity and fulfillment log
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#8c8e96] hover:text-[#1c1e24] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Action Bar */}
          {unreadCount > 0 && (
            <div className="px-6 py-2.5 bg-[#f5f2ec] border-b border-[#e5e1da] flex items-center justify-between text-xs">
              <span className="text-[#5a5f6b]">
                {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-[#c26d40] hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-16 text-center space-y-1">
                <p className="text-sm font-medium text-[#1c1e24]">No notifications</p>
                <p className="text-xs text-[#8c8e96]">
                  Activity updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && onMarkRead(n._id)}
                  className={`p-4 rounded-lg transition-colors cursor-pointer border ${
                    !n.isRead
                      ? "bg-white border-[#e5e1da]"
                      : "bg-white/60 border-transparent hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase font-medium tracking-wider text-[#8c8e96]">
                      {n.type}
                    </span>
                    <span className="text-[10px] text-[#8c8e96]">
                      {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#1c1e24] leading-snug">
                    {n.title}
                  </h4>
                  <p className="text-xs text-[#5a5f6b] mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
