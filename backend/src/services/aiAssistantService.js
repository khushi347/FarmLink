const { GoogleGenAI } = require("@google/genai");

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });
}

/**
 * Deterministic fallback synthesizer used when LLM is unavailable or unconfigured.
 * Strictly formats factual response from verified context fields.
 */
const synthesizeDeterministicResponse = (question = "", context = {}) => {
    const q = question.toLowerCase();

    // 1. Distance & Logistics Savings Queries
    if (q.includes("distance") || q.includes("saving") || q.includes("fuel") || q.includes("cost") || q.includes("km")) {
        if (context.logisticsSavings) {
            const ls = context.logisticsSavings;
            return `Based on verified platform logistics, FarmLink batched routing has saved an estimated ${ls.distanceSavedKm} km of road travel (${ls.distanceSavedPercentage}% reduction vs. ${ls.individualDistanceBaselineKm} km of unbatched direct dispatches). This represents an estimated ₹${ls.estimatedDeliveryCostSavedInr.toLocaleString()} in cooperative delivery transit costs and ₹${ls.estimatedFuelSavedInr.toLocaleString()} in fuel savings across ${ls.totalDeliveries} deliveries.`;
        }
        if (context.shopPerformance) {
            const sp = context.shopPerformance;
            return `For your shop (${context.shopInfo?.name || "your store"}), your completed corridors have saved an estimated ${sp.totalDistanceSavedKm} km of road travel, contributing ₹${sp.cooperativeSavingsContributedInr.toLocaleString()} in cooperative savings with an average trip route of ${sp.averageTripDistanceKm} km across ${sp.tripsCompleted} completed trips.`;
        }
    }

    // 2. Trips Created / Status Queries
    if (q.includes("trip") || q.includes("trips created") || q.includes("completed")) {
        if (context.platformSummary) {
            const ps = context.platformSummary;
            return `Platform operational pulse: ${ps.tripsCreated} TripBlocks have been created, with ${ps.completedDeliveries} corridors fully completed and delivered. On average, trips contain ${ps.averageOrdersPerTrip} orders per batch, with ${ps.dailyOrdersToday} new orders placed today.`;
        }
        if (context.shopPerformance) {
            const sp = context.shopPerformance;
            return `Your shop has fulfilled ${sp.tripsCompleted} completed trips with ${sp.activeTripsCount} currently active and claimed. There are currently ${sp.availableTripsCount} open corridor trips available in the broadcast pool.`;
        }
    }

    // 3. Regional Demand / Most Orders
    if (q.includes("region") || q.includes("village") || q.includes("corridor") || q.includes("most orders") || q.includes("area")) {
        if (context.regionalDemand && context.regionalDemand.length > 0) {
            const top = context.regionalDemand[0];
            const others = context.regionalDemand.slice(1, 3).map((r) => `${r.region} (${r.orderCount} orders)`).join(", ");
            return `Regional demand analysis indicates that ${top.region} currently leads with ${top.orderCount} orders, followed by ${others}. Services in high demand include: ${top.services.join(", ")}.`;
        }
    }

    // 4. Shop Acceptance / Claim Rate
    if (q.includes("acceptance") || q.includes("claim rate") || q.includes("claim share") || q.includes("shop")) {
        if (context.shopPerformance) {
            const sp = context.shopPerformance;
            return `Your shop's Claim Share is currently ${sp.claimSharePercentage}%. FarmLink operates on a regional broadcast pool, so this metric reflects your share of regional corridors claimed and fulfilled.`;
        }
        if (context.activeShops) {
            return `There are currently ${context.platformSummary?.activeShopsCount || context.activeShops.length} active retail partner shops participating across operational corridors.`;
        }
    }

    // 5. Recommendations / Grouping Opportunities
    if (q.includes("recommend") || q.includes("group") || q.includes("opportunity") || q.includes("delay")) {
        if (context.factualRecommendations && context.factualRecommendations.length > 0) {
            const r = context.factualRecommendations[0];
            return `Operational recommendation: ${r.factualDescription} (Closest order is ${r.closestProximityKm} km away. Combining would save an estimated ${r.potentialDistanceSavedKm} km / ₹${r.potentialCostSavedInr}).`;
        }
        return "There are currently no ungrouped orders within the 5 km proximity threshold of active TripBlocks. Corridors are currently operating efficiently.";
    }

    // Default overview summary
    if (context.platformSummary) {
        const ps = context.platformSummary;
        return `FarmLink Platform Summary: ${ps.totalOrders} total orders (${ps.ordersGrouped} grouped, ${ps.groupingRatePercentage}% grouping rate). ${ps.tripsCreated} trips created with an average density of ${ps.averageOrdersPerTrip} orders/trip across ${ps.activeShopsCount} active shops.`;
    }

    if (context.shopPerformance) {
        const sp = context.shopPerformance;
        return `Shop Summary for ${context.shopInfo?.name}: Total revenue ₹${sp.revenueInr.toLocaleString()} across ${sp.tripsCompleted} fulfilled trips with a Claim Share of ${sp.claimSharePercentage}%.`;
    }

    return "FarmLink operational assistant is ready. You can ask about order volumes, delivery distance savings, regional corridor demand, or grouping opportunities.";
};

/**
 * Builds the strict prompt that forbids hallucination and constrains LLM to factual context.
 */
const buildSystemPrompt = (question, context, userRole) => {
    return `You are the FarmLink AI Operations Assistant for agricultural supply logistics.
You are assisting a verified ${userRole === "admin" ? "Platform Coordinator (Admin)" : "Partner Retail Shopkeeper"}.

CRITICAL SYSTEM CONSTRAINTS:
1. You must answer the user's question ONLY using the factual numbers, trips, and corridor data provided in the VERIFIED OPERATIONAL CONTEXT below.
2. NEVER hallucinate, extrapolate, or invent trip IDs, order codes, distances, fuel savings, revenue amounts, or regional names.
3. If the user asks about a metric not present in the context, explicitly explain that it is not in current records.
4. Keep your answer professional, concise, direct, and actionable (2-4 sentences). Use bold formatting for key metrics and figures.
5. If the context contains factual recommendations, highlight them clearly with the exact computed distances.

VERIFIED OPERATIONAL CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
"${question}"

YOUR FACTUAL RESPONSE:`;
};

/**
 * Query the AI Operations Assistant with strict hallucination control and graceful fallback.
 *
 * @param {Object} params - { question: string, structuredContext: Object, userRole: string }
 * @returns {Promise<Object>} - { answer: string, source: "ai" | "deterministic_fallback", recommendations: Array }
 */
const queryAssistant = async ({ question, structuredContext, userRole = "admin" }) => {
    if (!question || typeof question !== "string") {
        throw new Error("Question string is required");
    }

    const recommendations = structuredContext.factualRecommendations || [];

    // If Gemini client is not initialized, use deterministic fallback
    if (!aiClient || !process.env.GEMINI_API_KEY) {
        const fallbackText = synthesizeDeterministicResponse(question, structuredContext);
        return {
            answer: fallbackText,
            source: "deterministic_fallback",
            recommendations,
            structuredContext,
        };
    }

    try {
        const prompt = buildSystemPrompt(question, structuredContext, userRole);

        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const answerText = response.text ? response.text.trim() : "";

        if (!answerText) {
            throw new Error("Empty response from AI model");
        }

        return {
            answer: answerText,
            source: "ai",
            recommendations,
            structuredContext,
        };
    } catch (error) {
        console.warn("[AiAssistantService] Gemini call failed, using deterministic fallback:", error.message);
        const fallbackText = synthesizeDeterministicResponse(question, structuredContext);
        return {
            answer: fallbackText,
            source: "deterministic_fallback",
            fallbackReason: error.message,
            recommendations,
            structuredContext,
        };
    }
};

module.exports = {
    synthesizeDeterministicResponse,
    buildSystemPrompt,
    queryAssistant,
};
