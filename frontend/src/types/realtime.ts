export type RealtimeEventName =
  | "new_order"
  | "trip_created"
  | "trip_claimed"
  | "trip_completed";

export interface RealtimeEvent<T> {
  eventId: string;
  occurredAt: string;
  data: T;
}

export interface RealtimeConnectionState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
  error: string | null;
}
