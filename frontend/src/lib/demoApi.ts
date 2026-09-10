/**
 * demoApi.ts — Public demo API client.
 * No authentication token required — all demo endpoints are public.
 * Uses the same Next.js /api proxy (→ http://localhost:5000/api).
 */

export interface DemoTokenResponse {
    success: boolean;
    token: string;
    sessionId: string;
}

export interface DemoStatusResponse {
    success: boolean;
    stage: string;
    stageIndex: number;
    totalStages: number;
    orderCount: number;
    tripBlockId: string | null;
    isComplete: boolean;
}

export interface DemoStepResponse {
    success: boolean;
    stage: string;
    stageIndex: number;
    totalStages: number;
    message?: string;
    [key: string]: unknown;
}

export interface DemoResetResponse {
    success: boolean;
    message: string;
    deleted?: { orders: number; farmers: number; tripBlocks: number };
}

const base = "/api/demo";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!res.ok) {
        let msg = "Request failed";
        try {
            const j = await res.json();
            msg = j.message || msg;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    return res.json() as Promise<T>;
}

export const demoApi = {
    /** Issue a demo JWT for the given sessionId (or generate a new one). */
    getToken: (sessionId?: string) => {
        const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
        return request<DemoTokenResponse>(`/token${qs}`);
    },

    /** Get current stage state for a session. */
    getStatus: (sessionId: string) =>
        request<DemoStatusResponse>(`/status?sessionId=${encodeURIComponent(sessionId)}`),

    /** Advance demo by one stage. */
    runStep: (sessionId: string) =>
        request<DemoStepResponse>("/step", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
        }),

    /** Delete all demo data for this session and reset to IDLE. */
    reset: (sessionId: string) =>
        request<DemoResetResponse>("/reset", {
            method: "DELETE",
            body: JSON.stringify({ sessionId }),
        }),

    /** Fetch demo-scoped map data (same shape as /api/map/data). */
    getMapData: (sessionId: string) =>
        request<import("@/types/map").MapDataResponse>(`/map?sessionId=${encodeURIComponent(sessionId)}`),

    /* ── Interactive Demo Scenarios ────────────────── */
    getScenarioPresets: () =>
        request<{ success: boolean; presets: Record<string, { transcript: string; language: string; expected: any }> }>("/scenarios/presets"),

    runAiOrderScenario: (text: string, sessionId: string) =>
        request<{
            success: boolean;
            extractionSource: string;
            transcript: string;
            aiData: { serviceType: string; products: Array<{ name: string; quantity: number; unit: string }>; deliveryDate: string; language: string };
            order: { id: string; code: string; serviceType: string; products: any[]; status: string; requestedDate: string; coordinates: [number, number]; isDemo: boolean; demoSessionId: string };
            farmer: { id: string; name: string; phone: string; language: string };
        }>("/scenarios/ai-order", {
            method: "POST",
            body: JSON.stringify({ text, sessionId }),
        }),

    runSharedDeliveryScenario: (sessionId: string) =>
        request<{
            success: boolean;
            seededOrdersCount: number;
            groupedOrdersCount: number;
            allGroupedVerified: boolean;
            tripBlock: { id: string; code: string; serviceType: string; status: string; centerCoordinates: [number, number]; orderCount: number; estimatedEarnings: number; isDemo: boolean; demoSessionId: string };
            orders: Array<{ id: string; code: string; farmerName: string; village: string; quantity: number; coordinates: [number, number] }>;
        }>("/scenarios/shared-delivery", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
        }),

    runShopCompetitionScenario: (sessionId: string) =>
        request<{
            success: boolean;
            tripId: string;
            tripCode: string;
            finalLifecycleStatus: string;
            winner: { shopKey: string; shopId: string; shopName: string; httpStatus: number; message: string };
            rejectedShops: Array<{ shopKey: string; shopId: string; shopName: string; httpStatus: number; message: string }>;
        }>("/scenarios/shop-competition", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
        }),

    runRealtimeNotificationScenario: (sessionId: string) =>
        request<{
            success: boolean;
            notification: { id: string; title: string; message: string; channel: string; type: string; isDemo: boolean; createdAt: string };
            tripBlock: { id: string; code: string; status: string; earnings: number };
            socketEmitted: boolean;
        }>("/scenarios/realtime-notification", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
        }),

    resetScenarios: (sessionId: string) =>
        request<{
            success: boolean;
            sessionId: string;
            deleted: { orders: number; farmers: number; tripBlocks: number; notifications: number };
        }>("/scenarios/reset", {
            method: "DELETE",
            body: JSON.stringify({ sessionId }),
        }),
};

