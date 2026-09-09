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
  outForDelivery: (tripId: string, token?: string) =>
    request<{ success: boolean; message: string; trip: any }>(`/trip-blocks/${tripId}/out-for-delivery`, { method: "POST" }, token),
  cancel: (tripId: string, reason?: string, token?: string) =>
    request<{ success: boolean; message: string; trip: any }>(`/trip-blocks/${tripId}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }, token),
  sendReminder: (tripId: string, message?: string, token?: string) =>
    request<{ success: boolean; message: string }>(`/trip-blocks/${tripId}/reminder`, { method: "POST", body: JSON.stringify({ message }) }, token),
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
  claimShareRate?: number;
  metricLabel?: string;
  averageTripDistanceKm?: number;
  distanceSavedKm?: number;
  cooperativeSavingsInr?: number;
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
  status: "CREATED" | "OPEN" | "CLAIMED" | "COMPLETED" | "CANCELLED";
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
  averageTripDistanceKm?: number;
  totalDistanceKm?: number;
  totalDistanceSavedKm?: number;
  cooperativeSavingsInr?: number;
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

  getAnalytics: (token?: string) =>
    request<{ success: boolean; data: ShopAnalyticsData }>("/shop/analytics", {}, token),

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

export interface AdminDashboardMetrics {
  totalCustomers: number;
  activeShops: number;
  ordersToday: number;
  activeTrips: number;
  completedDeliveries: number;
}

export interface AdminCustomer {
  _id: string;
  name: string;
  phone: string;
  village?: string;
  location?: { coordinates: [number, number] };
  createdAt: string;
  totalOrders: number;
  lastOrderDate?: string;
}

export interface AdminShopkeeper {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  shop?: {
    _id: string;
    shopName: string;
    village?: string;
    isActive?: boolean;
  };
}

export interface AdminShop {
  _id: string;
  shopName: string;
  phone: string;
  village?: string;
  category: string[];
  serviceType: string;
  isActive: boolean;
  owner?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  location?: { coordinates: [number, number] };
  createdAt: string;
}

export interface AdminProductsData {
  supportedCategories: string[];
  productStats: Array<{
    _id: string;
    orderCount: number;
    totalQuantity: number;
  }>;
}

export interface AdminOrderDetails {
  _id: string;
  serviceType: string;
  status: string;
  products: Array<{
    name: string;
    category?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
  totalAmount: number;
  farmer: {
    _id: string;
    name: string;
    phone?: string;
    village?: string;
    location?: any;
  };
  assignedShop?: {
    _id: string;
    shopName: string;
    phone?: string;
    village?: string;
  };
  tripBlock?: {
    _id: string;
    status: string;
    assignedShop?: string;
    claimedAt?: string;
    completedAt?: string;
  };
  destination?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTripDetails {
  _id: string;
  serviceType: string;
  status: string;
  orders: any[];
  assignedShop?: {
    _id: string;
    shopName: string;
    phone?: string;
    village?: string;
    location?: any;
  };
  claimedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  routeDetails?: {
    waypoints: any[];
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
  };
}

export const adminApi = {
  getDashboard: (token?: string) =>
    request<{ success: boolean; data: AdminDashboardMetrics }>("/admin/dashboard", {}, token),

  getCustomers: (params?: { page?: number; limit?: number; search?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ success: boolean; total: number; page: number; totalPages: number; data: AdminCustomer[] }>(`/admin/customers${qs}`, {}, token);
  },

  getShopkeepers: (token?: string) =>
    request<{ success: boolean; total: number; data: AdminShopkeeper[] }>("/admin/shopkeepers", {}, token),

  getShops: (token?: string) =>
    request<{ success: boolean; total: number; data: AdminShop[] }>("/admin/shops", {}, token),

  toggleShopStatus: (shopId: string, token?: string) =>
    request<{ success: boolean; message: string; shop: { id: string; shopName: string; isActive: boolean } }>(`/admin/shops/${shopId}/status`, { method: "PATCH" }, token),

  getProducts: (token?: string) =>
    request<{ success: boolean; data: AdminProductsData }>("/admin/products", {}, token),

  getOrderDetails: (orderId: string, token?: string) =>
    request<{ success: boolean; data: AdminOrderDetails }>(`/admin/orders/${orderId}`, {}, token),

  getTripDetails: (tripId: string, token?: string) =>
    request<{ success: boolean; data: AdminTripDetails }>(`/admin/trips/${tripId}`, {}, token),
};

export interface DailyOrderTrend {
  date: string;
  totalOrders: number;
  groupedOrders: number;
  completedOrders: number;
}

export interface PlatformAnalyticsSummary {
  dailyOrdersToday: number;
  totalOrders: number;
  ordersGrouped: number;
  ordersGroupedPercentage: number;
  tripsCreated: number;
  activeShops: number;
  completedDeliveries: number;
  averageOrdersPerTrip: number;
}

export interface PlatformAnalyticsData {
  summary: PlatformAnalyticsSummary;
  timeseries: DailyOrderTrend[];
  isDemo: boolean;
}

export interface CorridorEfficiencyItem {
  corridor: string;
  tripsCount: number;
  deliveriesCount: number;
  individualDistanceKm: number;
  sharedDistanceKm: number;
  distanceSavedKm: number;
  savedCostInr: number;
}

export interface LogisticsAnalyticsData {
  totalTripsEvaluated: number;
  totalDeliveries: number;
  totalDistanceKm: number;
  totalSharedDistanceKm: number;
  totalIndividualDistanceKm: number;
  totalDistanceSavedKm: number;
  distanceSavedPercentage: number;
  estimatedFuelSavedInr: number;
  estimatedDeliveryCostSavedInr: number;
  corridorBreakdown: CorridorEfficiencyItem[];
  assumptions: {
    fuelCostPerKm: number;
    deliveryCostPerKm: number;
    baseline: string;
    disclaimer: string;
  };
  isDemo: boolean;
}

export interface ShopAnalyticsData {
  revenue: number;
  tripsCompleted: number;
  activeTrips: number;
  availableTrips: number;
  acceptanceRate: number;
  claimShareRate: number;
  metricLabel: string;
  metricExplanation: string;
  averageTripDistanceKm: number;
  totalDistanceDeliveredKm: number;
  totalDistanceSavedKm: number;
  cooperativeSavingsContributedInr: number;
  fuelSavingsInr: number;
  shopName?: string;
  village?: string;
  assumptions: {
    deliveryCostPerKm: number;
    fuelCostPerKm: number;
  };
  isDemo: boolean;
}

export const analyticsApi = {
  getPlatform: (params?: { days?: number }, token?: string) => {
    const qs = params?.days ? `?days=${params.days}` : "";
    return request<{ success: boolean; data: PlatformAnalyticsData }>(`/analytics/platform${qs}`, {}, token);
  },
  getLogistics: (token?: string) =>
    request<{ success: boolean; data: LogisticsAnalyticsData }>("/analytics/logistics", {}, token),
};



