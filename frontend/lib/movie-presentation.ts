import type { Language } from "@/lib/usePresentationLanguage";

const MOVIE_GENRE_EN: Readonly<Record<string, string>> = Object.freeze({
  "Bí ẩn": "Mystery",
  "Gia đình": "Family",
  "Giật gân": "Thriller",
  "Hành động": "Action",
  "Khoa học viễn tưởng": "Science fiction",
  "Kỳ ảo": "Fantasy",
  "Phiêu lưu": "Adventure",
  "Tâm lý": "Drama",
  "Tình cảm": "Romance",
  "Tội phạm": "Crime",
  "Trinh thám": "Detective",
});

const MOVIE_LANGUAGE_EN: Readonly<Record<string, string>> = Object.freeze({
  "Tiếng Việt": "Vietnamese",
  "Tiếng Anh": "English",
  "Tiếng Hàn": "Korean",
  "Tiếng Nhật": "Japanese",
  "Tiếng Trung": "Chinese",
  "Tiếng Pháp": "French",
  "Tiếng Thái": "Thai",
});

export function movieGenreLabel(value: string, language: Language): string {
  if (language === "vi") return value;
  return value
    .split(/[,/|]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => MOVIE_GENRE_EN[part] ?? part)
    .join(", ");
}

export function movieLanguageLabel(value: string, language: Language): string {
  return language === "en" ? (MOVIE_LANGUAGE_EN[value.trim()] ?? value) : value;
}
