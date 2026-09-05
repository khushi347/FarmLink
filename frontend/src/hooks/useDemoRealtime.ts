"use client";

/**
 * useDemoRealtime.ts
 *
 * Self-contained Socket.IO hook for the demo page.
 * Does NOT depend on RealtimeContext or AuthContext.
 * Connects with a short-lived demo JWT, joins the visitor's
 * session-scoped room (demo:{sessionId}), and exposes a
 * subscribe() function for demo:* events.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { demoApi } from "@/lib/demoApi";

export type DemoEventName =
    | "demo:order_submitted"
    | "demo:tripblock_created"
    | "demo:trip_claimed"
    | "demo:trip_completed";

export type DemoConnectionStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error"
    | "disconnected";

const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export function useDemoRealtime(sessionId: string | null) {
    const socketRef = useRef<Socket | null>(null);
    const listenersRef = useRef(
        new Map<string, Set<(payload: unknown) => void>>()
    );
    const seenIdsRef = useRef(new Set<string>());

    const [status, setStatus] = useState<DemoConnectionStatus>("idle");

    useEffect(() => {
        if (!sessionId) return;

        let cancelled = false;

        const connect = async () => {
            try {
                setStatus("connecting");
                const { token } = await demoApi.getToken(sessionId);
                if (cancelled) return;

                const socket = io(socketUrl, {
                    auth: { token },
                    transports: ["websocket", "polling"],
                    reconnection: true,
                });
                socketRef.current = socket;

                socket.on("connect", () => setStatus("connected"));
                socket.on("disconnect", () => setStatus("disconnected"));
                socket.io.on("reconnect_attempt", () => setStatus("reconnecting"));
                socket.on("connect_error", () => setStatus("error"));

                // Listen for all demo events and route to registered listeners
                const demoEvents: DemoEventName[] = [
                    "demo:order_submitted",
                    "demo:tripblock_created",
                    "demo:trip_claimed",
                    "demo:trip_completed",
                ];

                demoEvents.forEach((event) => {
                    socket.on(event, (payload: unknown) => {
                        // Deduplicate by eventId
                        if (
                            payload &&
                            typeof payload === "object" &&
                            "eventId" in payload
                        ) {
                            const id = String((payload as Record<string, unknown>).eventId);
                            if (seenIdsRef.current.has(id)) return;
                            seenIdsRef.current.add(id);
                            if (seenIdsRef.current.size > 200) {
                                const oldest = seenIdsRef.current.values().next().value;
                                if (oldest) seenIdsRef.current.delete(oldest);
                            }
                        }
                        listenersRef.current
                            .get(event)
                            ?.forEach((listener) => listener(payload));
                    });
                });
            } catch {
                if (!cancelled) setStatus("error");
            }
        };

        connect();

        return () => {
            cancelled = true;
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [sessionId]);

    const subscribe = useCallback(
        <T>(event: DemoEventName, listener: (payload: T) => void): (() => void) => {
            const listeners =
                listenersRef.current.get(event) || new Set<(p: unknown) => void>();
            const typed = listener as (payload: unknown) => void;
            listeners.add(typed);
            listenersRef.current.set(event, listeners);
            return () => {
                listeners.delete(typed);
                if (listeners.size === 0) listenersRef.current.delete(event);
            };
        },
        []
    );

    return { status, subscribe };
}
