import React from "react";
import { Cormorant_Garamond } from "next/font/google";
import { InfoIcon, TruckIcon } from "./Icons";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

interface PlaceholderSectionProps {
  title: string;
  subtitle: string;
  description: string;
  role: "admin" | "shopkeeper";
  backendEndpoints: string[];
  mockDataLayout?: "metrics" | "table" | "trips" | "analytics";
  icon: React.ReactNode;
}

export default function PlaceholderSection({
  title,
  subtitle,
  description,
  mockDataLayout = "metrics",
  icon,
}: PlaceholderSectionProps) {
  return (
    <div className="space-y-8">
      
      {/* Editorial Document Header */}
      <div className="space-y-2 border-b border-[#e5e1da] pb-5">
        <div className="flex items-center gap-3">
          <span className="text-[#c26d40] bg-[#faf2ed] p-2 rounded-full border border-[#f0d8ca]">
            {icon}
          </span>
          <h1 className={`${cormorant.className} text-3xl font-light text-[#1c1e24] tracking-tight`}>
            {title}
          </h1>
        </div>
        <p className="text-xs text-stone-500 font-light leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Grounded Informational Bulletin */}
      <div className="p-4 bg-[#fbfaf7] rounded-lg border border-[#e5e1da] text-xs text-stone-600 font-light leading-relaxed flex items-start gap-2.5 shadow-3xs">
        <InfoIcon size={16} className="text-[#c26d40] shrink-0 mt-0.5" />
        <p>{description}</p>
      </div>

      {/* DYNAMIC WORKSPACE VISUALIZATIONS */}

      {/* METRICS VIEW: Lined operational log & ledger summary */}
      {mockDataLayout === "metrics" && (
        <div className="space-y-6">
          
          {/* Lined notepad log */}
          <div className="border border-[#e5e1da] bg-white rounded-lg p-5 shadow-3xs relative overflow-hidden">
            {/* Red notepad vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200/50" />
            <div className="relative z-10 pl-6 space-y-4">
              <h3 className={`${cormorant.className} text-lg font-bold text-stone-800 tracking-wide border-b border-[#e5e1da] pb-1.5`}>
                Daily Action Checklist
              </h3>
              <div className="space-y-3.5 text-xs font-light text-stone-600">
                {[
                  { text: "Confirm morning WhatsApp intake batch for Sonipat Hub", done: true },
                  { text: "Log basmati rice request from Panipat Fields", done: true },
                  { text: "Parse latest WhatsApp conversational audio note via AI", done: false },
                  { text: "Publish ready TripBlocks for shop claims", done: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                      item.done 
                        ? "bg-[#faf2ed] border-[#f0d8ca] text-[#c26d40] font-bold" 
                        : "bg-white border-[#e5e1da]"
                    }`}>
                      {item.done ? "✓" : ""}
                    </span>
                    <span className={item.done ? "line-through text-stone-400" : "text-stone-700"}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simple ledger numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Active TripBlocks", val: "09", desc: "Open for shop claims" },
              { label: "Cooperative Savings", val: "₹ 4,850", desc: "Direct wholesale rates" },
              { label: "Ledger Funds", val: "₹ 45,200", desc: "Cooperative balance" }
            ].map((ledger, idx) => (
              <div key={idx} className="border border-[#e5e1da] bg-white rounded-lg p-4 space-y-1 shadow-3xs">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{ledger.label}</span>
                <p className={`${cormorant.className} text-3xl font-light text-[#1c1e24] mt-0.5`}>{ledger.val}</p>
                <p className="text-[10px] text-stone-400 font-light leading-none">{ledger.desc}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TABLE VIEW: Simplified Register Table */}
      {mockDataLayout === "table" && (
        <div className="border border-[#e5e1da] bg-white rounded-lg p-5 shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5e1da] pb-3">
            <span className={`${cormorant.className} text-xl font-bold text-stone-800`}>Logbook Records</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#c26d40] bg-[#faf2ed] border border-[#f0d8ca] px-2.5 py-0.5 rounded">
              Active Logs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-light text-stone-600">
              <thead>
                <tr className="border-b border-[#e5e1da] text-stone-400">
                  <th className="py-2 text-left font-normal uppercase tracking-wider text-[9px]">ID Reference</th>
                  <th className="py-2 text-left font-normal uppercase tracking-wider text-[9px]">Origin / Cooperative</th>
                  <th className="py-2 text-left font-normal uppercase tracking-wider text-[9px]">Status Phase</th>
                  <th className="py-2 text-right font-normal uppercase tracking-wider text-[9px]">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[
                  { id: "FL-ORD-2094", hub: "Karnal Farm Cooperative", phase: "AI Parsed", color: "text-[#c26d40]" },
                  { id: "FL-ORD-2095", hub: "Panipat Rice Fields", phase: "In Grouping Queue", color: "text-[#426890]" },
                  { id: "FL-ORD-2096", hub: "Town Market Hub", phase: "Claimed & In Delivery", color: "text-emerald-600" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-stone-500">{row.id}</td>
                    <td className="py-3 font-semibold text-stone-800">{row.hub}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${row.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {row.phase}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-[10px] font-bold uppercase tracking-wider text-[#c26d40] hover:underline">
                        Verify Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRIPS VIEW: Visual TripBlock Manifolds */}
      {mockDataLayout === "trips" && (
        <div className="space-y-5">
          {[
            { 
              from: "Sonipat Farm Cluster", 
              to: "Green Valley Supply", 
              tripCode: "TB-204", 
              cargo: "420 kg (Cauliflower & Greens)", 
              time: "Shop Claim Window • Open 45m",
              status: "Available for Shop Claim" 
            },
            { 
              from: "Panipat Rice Fields", 
              to: "Mohan Agro Mart", 
              tripCode: "TB-188", 
              cargo: "600 kg (Premium Basmati)", 
              time: "Claimed by Shop • In Transit",
              status: "En Route to Shop" 
            },
          ].map((trip, idx) => (
            <div key={idx} className="border border-[#e5e1da] bg-white rounded-lg p-5 shadow-3xs space-y-4 hover:border-[#f0d8ca] transition-colors duration-200">
              
              {/* Route line graphic overlay */}
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-stone-400 block mb-0.5">Collect From</span>
                  <span>{trip.from}</span>
                </div>
                
                {/* Transit track line */}
                <div className="flex-1 mx-5 flex items-center relative">
                  <div className="h-[1.5px] w-full bg-[#e5e1da]" />
                  <TruckIcon size={12} className="text-[#c26d40] absolute left-1/2 -translate-x-1/2" />
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[8px] uppercase tracking-wider text-stone-400 block mb-0.5">Destination Shop</span>
                  <span>{trip.to}</span>
                </div>
              </div>

              {/* TripBlock specs */}
              <div className="grid grid-cols-2 gap-3 text-xs font-light text-stone-600 border-t border-stone-200/50 pt-3">
                <div>
                  <span className="text-[8px] font-bold uppercase text-stone-400 block mb-0.5">TripBlock ID</span>
                  {trip.tripCode}
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-stone-400 block mb-0.5">Load Cargo</span>
                  {trip.cargo}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#c26d40] bg-[#faf2ed] border border-[#f0d8ca] px-2 py-0.5 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c26d40] animate-pulse" />
                  {trip.time}
                </span>
                <span className="text-[9px] font-bold uppercase text-stone-400 tracking-wider">
                  Status: {trip.status}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS VIEW: WhatsApp Ingestion bubbles & parse cards */}
      {mockDataLayout === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Chat bubbles (6 columns) */}
          <div className="md:col-span-6 border border-[#e5e1da] bg-[#eae7e1]/30 rounded-lg p-4 space-y-4 shadow-3xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
              Live WhatsApp Ingest Messages
            </span>
            <div className="space-y-3.5">
              {[
                { sender: "Farmer Sunil (Panipat)", msg: "Namaste ji, mere paas 15 bori chawal ready hai Panipat mandi ke paas. Request group kar do.", time: "10m ago" },
                { sender: "Shopkeeper Kalyan (Delhi)", msg: "Can we request an extra 50kg tomatoes for Thursday morning? Demand is high.", time: "30m ago" }
              ].map((chat, idx) => (
                <div key={idx} className="bg-white border border-[#e5e1da] rounded-lg p-3 space-y-1.5 shadow-3xs">
                  <div className="flex justify-between items-center text-[9px] font-bold text-stone-500">
                    <span>{chat.sender}</span>
                    <span>{chat.time}</span>
                  </div>
                  <p className="text-xs italic text-stone-600 bg-stone-50 p-2 rounded">
                    "{chat.msg}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI translation extraction cards (6 columns) */}
          <div className="md:col-span-6 space-y-4">
            {[
              { crop: "Rice (Premium Basmati)", qty: "15 bags (~750kg)", loc: "Panipat Mandi", action: "Move to Grouping Queue for TripBlock" },
              { crop: "Tomatoes", qty: "+50kg adjustment", loc: "Kalyan Store (Delhi)", action: "Updating order schedule FL-ORD-2094" }
            ].map((ext, idx) => (
              <div key={idx} className="border border-[#e5e1da] bg-white rounded-lg p-4 space-y-2.5 shadow-3xs">
                <span className="text-[8px] font-bold uppercase text-[#426890] tracking-wider block">AI Parse Node #{idx+1}</span>
                <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div>
                    <span className="text-[8px] font-bold uppercase text-stone-400 block">Crop</span>
                    <span className="font-semibold text-stone-800">{ext.crop}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold uppercase text-stone-400 block">Qty</span>
                    <span className="font-semibold text-stone-800">{ext.qty}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] font-bold uppercase text-stone-400 block">Location Coordinate</span>
                    <span className="font-semibold text-stone-700">{ext.loc}</span>
                  </div>
                </div>
                <div className="bg-[#ebf3fa] border border-[#d6e4f0] rounded px-2.5 py-1 text-[9.5px] font-bold text-[#426890] w-fit">
                  💡 Recommended Action: {ext.action}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Cooperative Community Notes Advisory block */}
      <div className="border border-[#e5e1da] bg-[#faf2ed]/10 rounded-lg p-5 shadow-3xs space-y-3.5">
        <h4 className={`${cormorant.className} text-lg font-bold text-stone-800 tracking-wide border-b border-[#e5e1da] pb-1.5`}>
          Cooperative Notice Board
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-stone-600 leading-relaxed">
          <div>
            <span className="text-[9px] font-bold uppercase text-[#c26d40] tracking-wider block mb-1">Cooperative Meeting</span>
            <strong>Monthly Hub Meetup:</strong> Saturday 10:00 AM at the central hub. All coordinators and shop partners welcome.
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-[#426890] tracking-wider block mb-1">Monsoon Alert</span>
            <strong>Weather Advisory:</strong> Heavy rainfall forecast in Sonipat region. Crop protection guidelines in effect.
          </div>
        </div>
      </div>

    </div>
  );
}
