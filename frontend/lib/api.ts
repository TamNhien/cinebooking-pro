"use client";
import { clearAuth, getAuth, setAuth, token } from "./auth";
import type { AuthResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
let refreshPromise: Promise<AuthResponse | null> | null = null;

type BraveNavigator = Navigator & {
  brave?: { isBrave?: () => Promise<boolean> };
};

let browserHintPromise: Promise<string | null> | null = null;

async function detectBrowserHint(): Promise<string | null> {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as BraveNavigator;
  try {
    if (nav.brave?.isBrave && (await nav.brave.isBrave())) return "Brave";
  } catch {}

  const ua = navigator.userAgent || "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Vivaldi\//i.test(ua)) return "Vivaldi";
  if (/SamsungBrowser\//i.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS\//i.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return null;
}

async function addClientIdentity(headers: Headers) {
  browserHintPromise ??= detectBrowserHint();
  const browser = await browserHintPromise;
  if (browser) headers.set("X-CineBooking-Browser", browser);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response) {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    const fieldMessage = body?.fields ? Object.values(body.fields)[0] : undefined;
    msg = (fieldMessage as string) || body.message || msg;
  } catch {}
  return msg;
}

async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!getAuth()) return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const headers = new Headers();
      await addClientIdentity(headers);
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const next = (await res.json()) as AuthResponse;
      setAuth(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) headers.set("Content-Type", "application/json");

  const publicAuthCall = path.startsWith("/auth/login") || path.startsWith("/auth/register") || path.startsWith("/auth/forgot-password") || path.startsWith("/auth/reset-password") || path.startsWith("/auth/refresh");
  const t = token();
  if (t && !publicAuthCall) headers.set("Authorization", `Bearer ${t}`);

  await addClientIdentity(headers);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const msg = await parseError(res);
    const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/register") || path.startsWith("/auth/refresh") || path.startsWith("/auth/forgot-password") || path.startsWith("/auth/reset-password");
    if (res.status === 401 && retry && !isAuthEndpoint && getAuth()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return api<T>(path, init, false);
    }
    if (res.status === 401 && !isAuthEndpoint) {
      clearAuth();
      throw new ApiError(res.status, "Phiên đăng nhập đã hết hạn hoặc đã bị thu hồi. Vui lòng đăng nhập lại.");
    }
    if (res.status === 403) throw new ApiError(res.status, msg || "Bạn không có quyền thực hiện thao tác này.");
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiBlob(path: string, init: RequestInit = {}, retry = true): Promise<Blob> {
  const headers = new Headers(init.headers);
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  await addClientIdentity(headers);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const msg = await parseError(res);
    if (res.status === 401 && retry && getAuth()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return apiBlob(path, init, false);
    }
    if (res.status === 401) {
      clearAuth();
      throw new ApiError(res.status, "Phiên đăng nhập đã hết hạn hoặc đã bị thu hồi. Vui lòng đăng nhập lại.");
    }
    if (res.status === 403) throw new ApiError(res.status, msg || "Bạn không có quyền thực hiện thao tác này.");
    throw new ApiError(res.status, msg);
  }
  return res.blob();
}

export async function logoutSession() {
  try {
    const headers = new Headers();
    await addClientIdentity(headers);
    await fetch(`${BASE}/auth/logout`, { method: "POST", headers, credentials: "include", cache: "no-store" });
  } catch {}
  clearAuth();
}


export const currency = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
export const dateTime = (v: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(v));
