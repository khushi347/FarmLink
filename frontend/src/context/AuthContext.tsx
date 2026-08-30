"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, User, ApiError } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const clearError = () => setError(null);

  // Initialize and check refresh token on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await authApi.refresh();
        const accessToken = data.accessToken;
        const decoded = decodeJwt(accessToken);

        if (decoded) {
          const userId = decoded.user || decoded.userId;
          const role = decoded.role;

          // Retrieve persisting details from localStorage
          let storedUser: User | null = null;
          try {
            const localData = localStorage.getItem("farmlink_user");
            if (localData) {
              const parsed = JSON.parse(localData);
              if (parsed.id === userId) {
                storedUser = parsed;
              }
            }
          } catch {
            // Ignore localStorage errors
          }

          const currentUser: User = storedUser || {
            id: userId,
            name: "User",
            role: role,
          };

          setToken(accessToken);
          setUser(currentUser);
          
          if (!storedUser) {
            localStorage.setItem("farmlink_user", JSON.stringify(currentUser));
          }
        }
      } catch (err) {
        // Safe to ignore on mount (means no active session)
        localStorage.removeItem("farmlink_user");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Set up periodic background refresh before 15m JWT expiry
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const data = await authApi.refresh();
        setToken(data.accessToken);
      } catch {
        // If refresh fails, session is invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem("farmlink_user");
        router.push("/login");
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(interval);
  }, [token, router]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = pathname === "/login";

    if (!token && !isPublicRoute) {
      router.push("/login");
    } else if (token && isPublicRoute) {
      router.push("/");
    }
  }, [token, pathname, isLoading, router]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("farmlink_user", JSON.stringify(data.user));
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout(token || undefined);
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("farmlink_user");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
