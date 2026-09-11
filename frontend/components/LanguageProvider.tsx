"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

type Language = "vi" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "vi";
    window.localStorage.removeItem("cinebooking_language");
  }, []);

  const setLanguage = () => {
    document.documentElement.lang = "vi";
  };

  const value = useMemo<LanguageContextValue>(() => ({ language: "vi", setLanguage }), []);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage phải được dùng bên trong LanguageProvider");
  return value;
}
