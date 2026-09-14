"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

export type Language = "vi" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "cinebooking_language";
const CHANGE_EVENT = "language-changed";

function normalizeLanguage(value: string | null | undefined): Language | null {
  return value === "vi" || value === "en" ? value : null;
}

function browserLanguageSnapshot(): Language {
  const saved = normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  if (saved) return saved;
  return normalizeLanguage(document.documentElement.lang) ?? "vi";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // V77.0.27: keep one React-owned language state and reconcile it in a layout
  // effect. The VI initializer still matches the server-rendered tree, while the
  // pre-hydration script has already restored document.lang from localStorage.
  // A layout effect therefore commits the persisted browser preference before the
  // first painted client frame instead of waiting for a passive effect. Bounded
  // post-hydration guards cover selective/late hydration without polling forever.
  const [language, setLanguageState] = useState<Language>("vi");

  useLayoutEffect(() => {
    let active = true;

    const commitLanguage = (next: Language) => {
      if (!active) return;
      setLanguageState(current => (current === next ? current : next));
      document.documentElement.lang = next;
      document.documentElement.dataset.cinebookingLanguageReady = next;
    };

    const reconcileFromBrowser = () => commitLanguage(browserLanguageSnapshot());

    const onLanguageChanged = (event: Event) => {
      const requested = normalizeLanguage((event as CustomEvent<string>).detail);
      if (requested) commitLanguage(requested);
      else reconcileFromBrowser();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEY) reconcileFromBrowser();
    };

    const onPageShow = () => reconcileFromBrowser();

    // Commit before paint, then re-check across a short finite hydration window.
    // This is intentionally bounded: it is not a timer-driven language store.
    reconcileFromBrowser();
    const postHydrationFrame = window.requestAnimationFrame(reconcileFromBrowser);
    const postHydrationTimers = [50, 250, 1000].map(delay =>
      window.setTimeout(reconcileFromBrowser, delay),
    );

    window.addEventListener(CHANGE_EVENT, onLanguageChanged as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      active = false;
      window.cancelAnimationFrame(postHydrationFrame);
      postHydrationTimers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener(CHANGE_EVENT, onLanguageChanged as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    // Update React state immediately for same-tab clicks, then persist/synchronize
    // the browser contract used by hard navigation, other tabs and legacy code.
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dataset.cinebookingLanguageReady = next;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
