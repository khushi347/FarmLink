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
