"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import {
  RealtimeConnectionState,
  RealtimeEvent,
  RealtimeEventName,
} from "@/types/realtime";

interface RealtimeEvents {
  new_order: RealtimeEvent<unknown>;
  trip_created: RealtimeEvent<unknown>;
  trip_claimed: RealtimeEvent<unknown>;
  trip_completed: RealtimeEvent<unknown>;
}

interface RealtimeContextValue extends RealtimeConnectionState {
  subscribe: <T extends RealtimeEventName>(
    event: T,
    listener: (payload: RealtimeEvents[T]) => void
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef(new Map<string, Set<(payload: unknown) => void>>());
  const seenEventIdsRef = useRef(new Set<string>());
  const [connection, setConnection] = useState<RealtimeConnectionState>({
    status: "disconnected",
    error: null,
  });

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnection({ status: "disconnected", error: null });
      return;
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;
    setConnection({ status: "connecting", error: null });

    const onConnect = () => setConnection({ status: "connected", error: null });
    const onDisconnect = () => setConnection({ status: "disconnected", error: null });
    const onReconnectAttempt = () => setConnection({ status: "reconnecting", error: null });
    const onConnectError = (error: Error) =>
      setConnection({ status: "error", error: error.message });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on("connect_error", onConnectError);

    const eventNames: RealtimeEventName[] = [
      "new_order",
      "trip_created",
      "trip_claimed",
      "trip_completed",
    ];
    const eventHandlers = eventNames.map((event) => {
      const handler = (payload: unknown) => {
        if (payload && typeof payload === "object" && "eventId" in payload) {
          const eventId = String(payload.eventId);
          if (seenEventIdsRef.current.has(eventId)) return;
          seenEventIdsRef.current.add(eventId);
          if (seenEventIdsRef.current.size > 500) {
            const oldest = seenEventIdsRef.current.values().next().value;
            if (oldest) seenEventIdsRef.current.delete(oldest);
          }
        }
        listenersRef.current.get(event)?.forEach((listener) => listener(payload));
      };
      socket.on(event, handler);
      return [event, handler] as const;
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off("connect_error", onConnectError);
      eventHandlers.forEach(([event, handler]) => socket.off(event, handler));
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [token]);

  const subscribe = useCallback(<T extends RealtimeEventName>(
    event: T,
    listener: (payload: RealtimeEvents[T]) => void
  ) => {
    const listeners = listenersRef.current.get(event) || new Set();
    listeners.add(listener as (payload: unknown) => void);
    listenersRef.current.set(event, listeners);
    return () => {
      listeners.delete(listener as (payload: unknown) => void);
      if (listeners.size === 0) listenersRef.current.delete(event);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ ...connection, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within RealtimeProvider");
  return context;
}
