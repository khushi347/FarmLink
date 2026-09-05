/**
 * API client library for FarmLink frontend.
 * Provides custom fetch wrapper with cookie credentials and token headers.
 */

const API_BASE = "/api";

export interface User {
  id: string;
  name: string;
  role: "admin" | "shopkeeper";
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Common request wrapper.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Ensure refresh token cookies are sent and stored
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  /**
   * Log in user using email and password.
   */
  login: (body: Record<string, string>) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * Refresh JWT token using HttpOnly cookie.
   */
  refresh: () =>
    request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    }),

  /**
   * Log out user and clear cookie.
   */
  logout: (token?: string) =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }, token),
};

export const mapApi = {
  /**
   * Fetch all geographic data (Shops, Orders, TripBlocks, Stats).
   */
  getMapData: (params?: { serviceType?: string; status?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.serviceType && params.serviceType !== "ALL") {
      query.set("serviceType", params.serviceType);
    }
    if (params?.status && params.status !== "ALL") {
      query.set("status", params.status);
    }
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return request<import("@/types/map").MapDataResponse>(`/map/data${queryString}`, {}, token);
  },
};

export const tripApi = {
  claim: (tripId: string, token?: string) =>
    request<{ success: boolean; message: string; trip: any }>(`/trip-blocks/${tripId}/claim`, { method: "POST" }, token),
  complete: (tripId: string, token?: string) =>
    request<{ success: boolean; message: string; trip: any }>(`/trip-blocks/${tripId}/complete`, { method: "POST" }, token),
};

export interface ShopDashboardMetrics {
  available: number;
  acceptedTrips: number;
  completedTrips: number;
  totalOrders: number;
  revenue: number;
  acceptanceRate: number;
  unreadNotifications: number;
  shopName: string;
  village: string;
  isDemo: boolean;
}

export interface ShopTrip {
  _id: string;
  id: string;
  code: string;
  village: string;
  distanceKm: number;
  orderCount: number;
  estimatedEarnings: number;
  serviceType: string;
  status: "OPEN" | "CLAIMED" | "COMPLETED";
  scheduledDate: string;
  claimedAt?: string;
  completedAt?: string;
  orders: any[];
  isDemo?: boolean;
}

export interface ShopNotification {
  _id: string;
  title: string;
  message: string;
  type: "TripBlock" | "Order" | "System";
  isRead: boolean;
  isDemo: boolean;
  createdAt: string;
  metadata?: any;
}

export interface ShopRevenueData {
  totalRevenue: number;
  completedTripsCount: number;
  trips: ShopTrip[];
  isDemo: boolean;
}

export interface ShopProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isDemo?: boolean;
  };
  shop: {
    id: string;
    shopName: string;
    phone: string;
    village: string;
    category: string[];
    location: any;
    isDemo?: boolean;
  };
  isDemo: boolean;
}

export const shopApi = {
  getMe: (token?: string) =>
    request<{ success: boolean; data: ShopProfileData }>("/shop/me", {}, token),

  getDashboard: (token?: string) =>
    request<{ success: boolean; data: ShopDashboardMetrics }>("/shop/dashboard", {}, token),

  getAvailableTrips: (params?: { serviceType?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.serviceType && params.serviceType !== "ALL") {
      query.set("serviceType", params.serviceType);
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ success: boolean; totalTrips: number; data: ShopTrip[] }>(`/shop/trips/available${qs}`, {}, token);
  },

  getAcceptedTrips: (params?: { serviceType?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.serviceType && params.serviceType !== "ALL") {
      query.set("serviceType", params.serviceType);
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ success: boolean; totalTrips: number; data: ShopTrip[] }>(`/shop/trips/accepted${qs}`, {}, token);
  },

  getCompletedTrips: (params?: { serviceType?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.serviceType && params.serviceType !== "ALL") {
      query.set("serviceType", params.serviceType);
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ success: boolean; totalTrips: number; data: ShopTrip[] }>(`/shop/trips/completed${qs}`, {}, token);
  },

  getRevenue: (token?: string) =>
    request<{ success: boolean; data: ShopRevenueData }>("/shop/revenue", {}, token),

  getOrders: (params?: { status?: string; serviceType?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.serviceType && params.serviceType !== "ALL") query.set("serviceType", params.serviceType);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ success: boolean; totalOrders: number; data: any[] }>(`/shop/orders${qs}`, {}, token);
  },

  getNotifications: (token?: string) =>
    request<{ success: boolean; unreadCount: number; data: ShopNotification[] }>("/shop/notifications", {}, token),

  markNotificationRead: (id: string, token?: string) =>
    request<{ success: boolean; data: ShopNotification }>(`/shop/notifications/${id}/read`, { method: "PATCH" }, token),

  markAllNotificationsRead: (token?: string) =>
    request<{ success: boolean; message: string }>("/shop/notifications/mark-all-read", { method: "POST" }, token),

  resetDemo: (token?: string) =>
    request<{ success: boolean; message: string }>("/shop/demo/reset", { method: "POST" }, token),
};


