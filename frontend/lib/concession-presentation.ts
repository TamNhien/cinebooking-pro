import type { Language } from "@/lib/usePresentationLanguage";

type ConcessionCopy = Readonly<{ name: string; description?: string }>;

// Controlled CineBooking catalog/seed vocabulary only. Unknown/admin-authored
// product names remain untouched so presentation localization never rewrites
// arbitrary business data.
const CONCESSION_EN: Readonly<Record<string, ConcessionCopy>> = Object.freeze({
  "Bắp Caramel": { name: "Caramel Popcorn", description: "Large caramel popcorn" },
  "Nước ngọt": { name: "Soft Drink", description: "Large soft drink" },
  "Combo Couple": { name: "Couple Combo", description: "2 popcorns + 2 drinks for two people" },
  "Bắp Caramel Vừa": { name: "Medium Caramel Popcorn", description: "Medium caramel popcorn" },
  "Bắp Phô Mai Lớn": { name: "Large Cheese Popcorn", description: "Large cheese-coated popcorn" },
  "Bắp Ngọt Lớn": { name: "Large Sweet Popcorn", description: "Large sweet popcorn" },
  "Coca-Cola Lớn": { name: "Large Coca-Cola", description: "Large Coca-Cola soft drink" },
  "Sprite Lớn": { name: "Large Sprite", description: "Large Sprite soft drink" },
  "Fanta Cam Lớn": { name: "Large Orange Fanta", description: "Large orange Fanta soft drink" },
  "Nước Suối Dasani": { name: "Dasani Water", description: "Dasani water 500 ml" },
  "Combo Solo": { name: "Solo Combo", description: "1 medium popcorn + 1 large drink" },
  "Combo Couple Plus": { name: "Couple Plus Combo", description: "1 large popcorn + 2 large drinks" },
  "Combo Family": { name: "Family Combo", description: "2 large popcorns + 4 large drinks" },
});

const DESCRIPTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Bắp rang caramel cỡ lớn": "Large caramel popcorn",
  "Nước ngọt cỡ lớn": "Large soft drink",
  "2 bắp + 2 nước cho hai người": "2 popcorns + 2 drinks for two people",
  "Bắp rang caramel cỡ vừa": "Medium caramel popcorn",
  "Bắp rang phủ phô mai cỡ lớn": "Large cheese-coated popcorn",
  "Bắp rang vị ngọt cỡ lớn": "Large sweet popcorn",
  "Nước ngọt Coca-Cola cỡ lớn": "Large Coca-Cola soft drink",
  "Nước ngọt Sprite cỡ lớn": "Large Sprite soft drink",
  "Nước ngọt Fanta cam cỡ lớn": "Large orange Fanta soft drink",
  "Nước suối Dasani 500 ml": "Dasani water 500 ml",
  "1 bắp vừa + 1 nước lớn": "1 medium popcorn + 1 large drink",
  "1 bắp lớn + 2 nước lớn": "1 large popcorn + 2 large drinks",
  "2 bắp lớn + 4 nước lớn": "2 large popcorns + 4 large drinks",
  "Combo rạp chiếu": "Cinema combo",
});

export function concessionProductName(name: string | null | undefined, language: Language): string {
  const value = String(name ?? "");
  return language === "en" ? (CONCESSION_EN[value]?.name ?? value) : value;
}

export function concessionProductDescription(
  description: string | null | undefined,
  language: Language,
  name?: string | null,
): string {
  const value = String(description ?? "");
  if (language !== "en") return value;
  if (value) return DESCRIPTION_EN[value] ?? value;
  return name ? (CONCESSION_EN[name]?.description ?? value) : value;
}

export function concessionProductPresentation(
  name: string | null | undefined,
  description: string | null | undefined,
  language: Language,
): { name: string; description: string } {
  const rawName = String(name ?? "");
  return {
    name: concessionProductName(rawName, language),
    description: concessionProductDescription(description, language, rawName),
  };
}
