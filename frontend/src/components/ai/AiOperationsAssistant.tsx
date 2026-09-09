"use client";

import React, { useState, useRef, useEffect } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import {
  aiAssistantApi,
  AssistantResponseData,
  GroupingRecommendation,
} from "@/lib/api";
import {
  BrainIcon,
  SparklesIcon,
  TrendingUpIcon,
  TruckIcon,
  ShoppingBagIcon,
  AlertTriangleIcon,
  CheckIcon,
  XIcon,
} from "../Icons";

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

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  source?: "ai" | "deterministic_fallback";
  recommendations?: GroupingRecommendation[];
  timestamp: string;
}

interface AiOperationsAssistantProps {
  token?: string;
  role?: "admin" | "shopkeeper";
  className?: string;
}

const DEFAULT_QUICK_QUESTIONS = [
  "How much delivery distance was saved this week?",
  "How many trips were created today?",
  "Which region has the most orders?",
  "Are there any grouping opportunities right now?",
];

export default function AiOperationsAssistant({
  token,
  role = "admin",
  className = "",
}: AiOperationsAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: role === "admin"
        ? "Hello, Coordinator. I am your **FarmLink Operations Assistant**. You can ask about incoming order volumes, corridor delivery savings, active shop performance, or grouping opportunities."
        : "Hello, Retail Partner. I am your **FarmLink Operations Assistant**. You can ask about your store's completed deliveries, cooperative distance savings, or available corridor batches.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || !token || isLoading) return;

    setError(null);
    setInputQuestion("");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await aiAssistantApi.ask(q, token);

      if (res.success && res.data) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: res.data.answer,
          source: res.data.source,
          recommendations: res.data.recommendations,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Assistant response was empty");
      }
    } catch (err: any) {
      console.error("[AiOperationsAssistant] Error querying assistant:", err);
      setError(err?.message || "Failed to contact assistant. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to render bold markdown formatting (**bold**)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-[#1c1e24]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`rounded-2xl bg-white border border-[#e5e1da] shadow-sm flex flex-col h-[560px] overflow-hidden ${jakarta.className} ${className}`}
    >
      {/* ── HEADER ── */}
      <div className="p-4 sm:px-6 border-b border-[#e5e1da] flex items-center justify-between bg-[#faf8f5]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-[#fff0e5] text-[#c26d40] border border-[#f5c4a0] shadow-3xs">
            <BrainIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`${cormorant.className} text-xl font-bold text-[#1c1e24] leading-none`}>
                FarmLink AI Operations Assistant
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#eef7f2] text-[#1f6e48] border border-[#a8d8bc]">
                Module 19
              </span>
            </div>
            <p className="text-[11px] text-[#8c8e96] mt-0.5">
              Verified factual context from MongoDB · Zero mathematical hallucination
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMessages(messages.slice(0, 1))}
          title="Clear conversation"
          className="p-1.5 rounded-lg text-[#8c8e96] hover:text-[#1c1e24] hover:bg-[#eee9df] transition-colors"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* ── MESSAGES LIST ── */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-white">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#c26d40] text-white rounded-br-none shadow-3xs font-medium"
                  : "bg-[#faf8f5] text-[#3c3e44] border border-[#ede9e2] rounded-bl-none shadow-3xs"
              }`}
            >
              <div className="whitespace-pre-wrap">{renderFormattedText(msg.text)}</div>

              {/* Factual Recommendations (if present) */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#ede5db] space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b84a0a]">
                    <SparklesIcon size={12} />
                    <span>Factual Operational Recommendations ({msg.recommendations.length})</span>
                  </div>

                  {msg.recommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-2.5 rounded-xl bg-white border border-[#f0d8c0] space-y-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1c1e24]">
                          Corridor: {rec.corridor} · {rec.serviceType}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-[#fff0e5] text-[#b84a0a] border border-[#f5c4a0]">
                          Trip {rec.tripCode}
                        </span>
                      </div>
                      <p className="text-[#5a5f6b] leading-normal">{rec.factualDescription}</p>
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-[#1f6e48] pt-1 border-t border-[#f5ece1]">
                        <span>📍 Proximity: {rec.closestProximityKm} km</span>
                        <span>🛣️ Est. Saved: {rec.potentialDistanceSavedKm} km</span>
                        <span>💰 Est. Cost Saved: ₹{rec.potentialCostSavedInr}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Meta / Subtitle */}
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-[10px] text-[#8c8e96]">{msg.timestamp}</span>
              {msg.source && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    msg.source === "ai"
                      ? "bg-[#f5eefb] text-[#7828c8] border border-[#dfc2f7]"
                      : "bg-[#f5f2ec] text-[#7a7469] border border-[#e5e1da]"
                  }`}
                >
                  {msg.source === "ai" ? "Gemini 2.5 Flash" : "Deterministic Engine"}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Loading / Thinking Pulse */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="p-3.5 rounded-2xl rounded-bl-none bg-[#faf8f5] border border-[#ede9e2] flex items-center gap-2.5 text-xs text-[#8c8e96]">
              <span className="h-2 w-2 rounded-full bg-[#c26d40] animate-ping" />
              <span>Analyzing factual operational context…</span>
            </div>
          </div>
        )}

        {/* Error Strip */}
        {error && (
          <div className="p-2.5 rounded-xl bg-[#fff5f5] border border-[#f0b0b0] text-[#902020] text-xs flex items-center gap-2">
            <AlertTriangleIcon size={14} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── QUICK PROMPT CHIPS ── */}
      <div className="px-4 py-2 bg-[#fdfaf5] border-t border-[#ede7dc] flex items-center gap-2 overflow-x-auto select-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8e96] shrink-0">
          Suggested:
        </span>
        {DEFAULT_QUICK_QUESTIONS.map((qText) => (
          <button
            key={qText}
            type="button"
            onClick={() => handleSend(qText)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-[#5a5f6b] hover:text-[#1c1e24] hover:bg-[#fff6ee] border border-[#e5e1da] hover:border-[#f5c4a0] transition-all disabled:opacity-50"
          >
            {qText}
          </button>
        ))}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="p-3 sm:px-4 bg-white border-t border-[#e5e1da] flex items-center gap-2">
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            role === "admin"
              ? "Ask about platform metrics, delivery distance savings, or corridor batches…"
              : "Ask about your shop's revenue, delivery savings, or corridor trips…"
          }
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d8d2c7] text-xs text-[#1c1e24] placeholder-[#8c8e96] focus:outline-none focus:border-[#c26d40] focus:bg-white transition-all"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputQuestion.trim() || isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#c26d40] hover:bg-[#a8582d] text-white font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs flex items-center gap-1.5"
        >
          <span>Ask</span>
          <SparklesIcon size={13} />
        </button>
      </div>
    </div>
  );
}
