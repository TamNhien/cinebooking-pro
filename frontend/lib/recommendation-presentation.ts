import type { Language } from "@/components/LanguageProvider";
import type { RecommendationScoreComponent, RecommendationTasteProfile } from "@/lib/types";

const SCORE_COPY: Record<string, { label: string; evidence: string }> = {
  GENRE_TASTE: {
    label: "Taste match",
    evidence: "Based on genres learned from your viewing history",
  },
  LANGUAGE_FIT: {
    label: "Language fit",
    evidence: "Matches languages you usually watch",
  },
  RATING_FIT: {
    label: "Content rating",
    evidence: "Matches your usual content rating",
  },
  DURATION_FIT: {
    label: "Duration fit",
    evidence: "Matches the movie duration you usually choose",
  },
  SCHEDULE_FIT: {
    label: "Schedule fit",
    evidence: "Matches your usual cinema, time of day, and viewing day",
  },
  ANCHOR: {
    label: "Anchor movie",
    evidence: "Matches your More like this feedback",
  },
  POPULARITY: {
    label: "Trend",
    evidence: "30-day community signal",
  },
  NOVELTY: {
    label: "Discovery",
    evidence: "Not seen in your personal signal history",
  },
};

const SIGNAL_COPY: Record<string, string> = {
  "Thể loại hợp gu": "Taste-aligned genres",
  "Phản hồi xem thêm phim tương tự": "More-like-this feedback",
  "Rạp thường xem": "Usual cinema",
  "Khung giờ thường xem": "Usual time of day",
  "Lượt đặt 30 ngày": "30-day bookings",
  "Hồ sơ gu đủ tín hiệu": "Taste profile has enough signals",
  "Ngôn ngữ hợp gu": "Preferred language match",
  "Thời lượng hợp gu": "Preferred duration match",
  "Ngày xem thường chọn": "Usual viewing day",
  "Phim mới với bạn": "New to you",
  "Hồ sơ cá nhân mạnh": "Strong personal profile",
  "Lượt yêu thích": "Favorites",
  "Đánh giá cộng đồng": "Community reviews",
  "Có lịch tại rạp đã chọn": "Available at the selected cinema",
};

const FEEDBACK_COPY: Record<string, string> = {
  "Đã ưu tiên thêm phim có gu tương tự.": "More movies with a similar taste will be prioritized.",
  "Đã giảm ưu tiên các phim có gu tương tự.": "Movies with a similar taste will be prioritized less.",
  "Đã ẩn phim này khỏi gợi ý cá nhân.": "This movie has been hidden from your personalized recommendations.",
  "Đã cập nhật phản hồi.": "Recommendation feedback updated.",
};

export function recommendationScoreCopy(part: RecommendationScoreComponent, language: Language) {
  if (language !== "en") return { label: part.label, evidence: part.evidence };
  return SCORE_COPY[part.key] ?? { label: part.label, evidence: part.evidence };
}

export function recommendationSignal(signal: string, language: Language) {
  return language === "en" ? (SIGNAL_COPY[signal] ?? signal) : signal;
}

export function recommendationFeedbackMessage(message: string, language: Language) {
  return language === "en" ? (FEEDBACK_COPY[message] ?? message) : message;
}

export function recommendationDaypartLabel(value: string | undefined, fallback: string | undefined, language: Language) {
  if (language !== "en") return fallback ?? "—";
  switch (value) {
    case "MORNING": return "Morning";
    case "AFTERNOON": return "Afternoon";
    case "EVENING": return "Evening";
    case "LATE": return "Late show";
    default: return fallback ?? "—";
  }
}

export function recommendationDurationLabel(value: string | undefined, fallback: string | undefined, language: Language) {
  if (language !== "en") return fallback ?? "—";
  switch (value) {
    case "SHORT": return "Short (≤ 100 minutes)";
    case "STANDARD": return "Standard (101–130 minutes)";
    case "LONG": return "Long (> 130 minutes)";
    default: return fallback ?? "—";
  }
}

export function recommendationWeekdayLabel(value: number | undefined, fallback: string | undefined, language: Language) {
  if (language !== "en") return fallback ?? "—";
  const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return value && value >= 1 && value <= 7 ? labels[value - 1] : (fallback ?? "—");
}

export function recommendationProfileSummary(profile: RecommendationTasteProfile | null, fallback: string, language: Language) {
  if (language !== "en") return profile?.summary || fallback;
  if (!profile) return fallback;
  if (!profile.personalized) {
    return "Not enough personal signals yet; CineBooking is using trends to help you discover new movies.";
  }
  const parts: string[] = [];
  const genres = profile.topGenres.slice(0, 3).map(x => x.name).filter(Boolean);
  if (genres.length) parts.push(`prioritizes ${genres.join(", ")}`);
  if (profile.topLanguages?.length) parts.push(`often watches ${profile.topLanguages[0].name}`);
  if (profile.preferredDurationBand) parts.push(`prefers ${recommendationDurationLabel(profile.preferredDurationBand, profile.preferredDurationLabel, "en").toLowerCase()}`);
  if (profile.preferredCinemaName) parts.push(`often watches at ${profile.preferredCinemaName}`);
  if (profile.preferredDaypart) parts.push(`often chooses ${recommendationDaypartLabel(profile.preferredDaypart, profile.preferredDaypartLabel, "en").toLowerCase()}`);
  if (profile.preferredWeekday) parts.push(`often goes on ${recommendationWeekdayLabel(profile.preferredWeekday, profile.preferredWeekdayLabel, "en").toLowerCase()}`);
  return parts.length ? `CineBooking ${parts.join(" · ")}.` : "Your movie taste is being refined from your activity and feedback.";
}

export function recommendationReason(reason: string, language: Language) {
  if (language !== "en" || !reason) return reason;
  const exact: Record<string, string> = {
    "Được đặt nhiều trong 30 ngày gần đây": "Frequently booked in the last 30 days",
    "Được nhiều thành viên yêu thích": "Popular with many members",
    "Được cộng đồng đánh giá tích cực": "Positively rated by the community",
    "Phim đang có lịch chiếu tại CineBooking": "Currently showing at CineBooking",
  };
  if (exact[reason]) return exact[reason];

  let match = reason.match(/^Vì bạn muốn xem thêm phim giống (.+)$/u);
  if (match) return `Because you asked for more movies like ${match[1]}`;
  match = reason.match(/^Khám phá mới nhưng vẫn hợp gu (.+)$/u);
  if (match) return `A new discovery that still matches your taste in ${match[1]}`;
  match = reason.match(/^Hợp gu (.+?) và có suất tại rạp bạn thường xem$/u);
  if (match) return `Matches your taste in ${match[1]} and has showtimes at your usual cinema`;
  match = reason.match(/^Hợp gu (.+?) và có suất đúng khung giờ bạn thường chọn$/u);
  if (match) return `Matches your taste in ${match[1]} and has showtimes in your usual time slot`;
  match = reason.match(/^Hợp gu (.+?) và ngôn ngữ (.+)$/u);
  if (match) return `Matches your taste in ${match[1]} and your usual movie language ${match[2]}`;
  match = reason.match(/^Hợp gu (.+?) và (gọn|vừa|dài) \((.+)\)$/iu);
  if (match) return `Matches your taste in ${match[1]} and your usual movie duration`;
  match = reason.match(/^Hợp gu (.+?) · có suất đúng (.+)$/u);
  if (match) return `Matches your taste in ${match[1]} · available on your usual viewing day`;
  match = reason.match(/^Hợp gu (.+)$/u);
  if (match) return `Matches your taste in ${match[1]}`;
  return reason;
}
