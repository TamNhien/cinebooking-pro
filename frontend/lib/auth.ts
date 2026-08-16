"use client";
import type { AuthResponse } from "./types";

const KEY = "cinebooking_auth_v3";
const LEGACY_KEYS = ["cinebooking_auth", "cinebooking_auth_v2"];

function cleanupLegacyAuth() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

export function getAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  try {
    cleanupLegacyAuth();
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export function setAuth(value: AuthResponse) {
  cleanupLegacyAuth();
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  cleanupLegacyAuth();
  window.dispatchEvent(new Event("auth-changed"));
}

export function token() {
  return getAuth()?.accessToken ?? null;
}
