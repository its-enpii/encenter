"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AUTH_TOKEN_STORAGE_KEY, AUTH_UNAUTHORIZED_EVENT, apiFetch } from "@/lib/api";

const TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  is_active?: boolean;
  last_login?: string | null;
}

interface AuthContextValue {
  /** True while the provider is restoring auth state on first paint. */
  loading: boolean;
  /** True when an auth_token exists in storage. Does not guarantee the token is still valid. */
  isAuthenticated: boolean;
  /** Decoded user info from `/auth/me`. Null until we have at least fetched once. */
  user: AuthUser | null;
  /** Persist token + user, redirect to /admin. */
  login: (token: string, user: AuthUser) => void;
  /** Revoke server-side token, clear local state, redirect to /login. */
  logout: () => Promise<void>;
  /** Re-fetch `/auth/me`, useful after profile updates. */
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return null;
      return (await res.json()) as AuthUser;
    } catch {
      return null;
    }
  }, []);

  // Bootstrap: restore token from localStorage and verify it.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }

    setToken(stored);
    fetchMe().then((u) => {
      // If /auth/me returned null we likely just got 401, in which case the
      // unauthorized listener below will already have cleared the token.
      setUser(u);
      setLoading(false);
    });
  }, [fetchMe]);

  // Tab sync: when another tab logs in/out, mirror the change here.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;
      const next = event.newValue;
      if (!next) {
        setToken(null);
        setUser(null);
        router.replace("/login");
      } else if (next !== token) {
        setToken(next);
        fetchMe().then(setUser);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router, fetchMe, token]);

  // Centralized 401 handler: apiFetch dispatches this when the API rejects us.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [router]);

  const login = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(nextUser);
      router.push("/admin");
    },
    [router],
  );

  const logout = useCallback(async () => {
    // Best-effort revoke; we still clear local state even if the request fails.
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    return u;
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      isAuthenticated: Boolean(token),
      user,
      login,
      logout,
      refreshUser,
    }),
    [loading, token, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}
