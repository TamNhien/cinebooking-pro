import type { Language } from "@/lib/usePresentationLanguage";
import type { NotificationItem } from "@/lib/types";
import { isSystemLoyaltyPresentation, systemLoyaltyPresentation } from "@/lib/loyalty-presentation";

export type NotificationPresentationPart = Readonly<{
  text: string;
  businessData?: boolean;
}>;

export type NotificationPresentation = Readonly<{
  title: readonly NotificationPresentationPart[];
  message: readonly NotificationPresentationPart[];
}>;

const text = (value: string): NotificationPresentationPart => ({ text: value });
const data = (value: string): NotificationPresentationPart => ({ text: value, businessData: true });
const compact = (parts: Array<NotificationPresentationPart | null | undefined | false>): NotificationPresentationPart[] =>
  parts.filter((part): part is NotificationPresentationPart => Boolean(part && part.text));

function fallback(item: Pick<NotificationItem, "title" | "message">, language: Language): NotificationPresentation {
  if (language === "vi") return { title: [text(item.title)], message: [text(item.message)] };
  // Unknown notification producers are treated as backend/business payloads instead of being
  // guessed by the presentation layer. Known CineBooking-owned templates are handled below.
  return { title: [data(item.title)], message: [data(item.message)] };
}

function supportReply(item: Pick<NotificationItem, "title" | "message">): NotificationPresentation {
  const caseNumber = item.title.match(/^CineBooking đã phản hồi\s+(.+)$/u)?.[1] ?? item.title;
  return {
    title: compact([text("CineBooking replied to "), data(caseNumber)]),
    // A support reply is authored by staff, not by the presentation catalog.
    message: [data(item.message)],
  };
}

function supportStatus(item: Pick<NotificationItem, "title" | "message">): NotificationPresentation {
  const caseNumber = item.title.match(/^Cập nhật yêu cầu\s+(.+)$/u)?.[1] ?? item.title;
  const match = item.message.match(/^Trạng thái mới:\s*([A-Z_]+)(?:\.\s*(.*))?$/u);
  if (!match) return { title: compact([text("Support request update "), data(caseNumber)]), message: [data(item.message)] };
  return {
    title: compact([text("Support request update "), data(caseNumber)]),
    message: compact([text("New status: "), text(match[1]), match[2] ? text(". ") : null, match[2] ? data(match[2]) : null]),
  };
}

function showtimeReminder(item: Pick<NotificationItem, "message">, minutes: boolean): NotificationPresentation {
  const unit = minutes ? "phút" : "giờ";
  const match = item.message.match(new RegExp(`^(.+) sẽ bắt đầu trong vòng (\\d+) ${unit}\\.(?:\\s*.*)?$`, "u"));
  if (!match) {
    return {
      title: [text(minutes ? "Showtime starting soon" : "Showtime coming up")],
      message: [data(item.message)],
    };
  }
  return {
    title: [text(minutes ? "Showtime starting soon" : "Showtime coming up")],
    message: compact([
      data(match[1]),
      text(` will start within ${match[2]} ${minutes ? "minutes" : "hours"}. `),
      text(minutes
        ? "Open your ticket QR and head to the check-in area."
        : "Check the cinema, seats, and ticket QR before leaving."),
    ]),
  };
}

function bookingInactive(item: Pick<NotificationItem, "message">, expired: boolean): NotificationPresentation {
  const bookingId = item.message.match(/^Booking\s+([^\s]+)\s+không còn hiệu lực/u)?.[1];
  return {
    title: [text(expired ? "Booking expired" : "Booking cancelled")],
    message: bookingId
      ? compact([text("Booking "), data(bookingId), text(" is no longer valid. Any redeemed points/voucher have been restored.")])
      : [data(item.message)],
  };
}

function transferReceived(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const bookingId = item.message.match(/^Bạn vừa nhận vé booking\s+([^\.]+)\./u)?.[1];
  return {
    title: [text("You received a CineBooking ticket")],
    message: bookingId
      ? compact([text("You just received booking "), data(bookingId), text(". A new QR ticket is ready in your Ticket Wallet.")])
      : [data(item.message)],
  };
}

function transferSent(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const match = item.message.match(/^Booking\s+([^\s]+)\s+đã được chuyển cho\s+(.+?)\.\s+QR cũ/u);
  return {
    title: [text("Ticket transferred successfully")],
    message: match
      ? compact([text("Booking "), data(match[1]), text(" was transferred to "), data(match[2]), text(". Your old QR ticket is no longer valid.")])
      : [data(item.message)],
  };
}

function waitlistSeat(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const match = item.message.match(/^(.+) vừa có (\d+) ghế trống\./u);
  return {
    title: [text("Seats are available again")],
    message: match
      ? compact([data(match[1]), text(` now has ${match[2]} available seats. Book soon before another customer holds them.`)])
      : [data(item.message)],
  };
}

function loyaltyReward(item: Pick<NotificationItem, "message">, language: Language): NotificationPresentation {
  const match = item.message.match(/^Bạn đã đổi (\d+) điểm lấy (.+)\.$/u);
  if (!match) return { title: [text("Points redeemed successfully")], message: [data(item.message)] };
  const reward = match[2];
  const knownReward = isSystemLoyaltyPresentation(reward);
  return {
    title: [text("Points redeemed successfully")],
    message: compact([
      text(`You redeemed ${match[1]} points for `),
      knownReward ? text(systemLoyaltyPresentation(reward, language)) : data(reward),
      text("."),
    ]),
  };
}

function loyaltyAdjust(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const match = item.message.match(/^([+-]?\d+) điểm\s*·\s*(.+)$/u);
  return {
    title: [text("Loyalty points adjusted")],
    message: match ? compact([text(`${match[1]} points · `), data(match[2])]) : [data(item.message)],
  };
}

function loyaltyClaimed(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const match = item.message.match(/^(.+) x(\d+) đã được nhân viên xác nhận giao\.$/u);
  return {
    title: [text("Membership reward collected")],
    message: match
      ? compact([data(match[1]), text(` x${match[2]} was confirmed as delivered by staff.`)])
      : [data(item.message)],
  };
}

function promotion(item: Pick<NotificationItem, "title" | "message">): NotificationPresentation {
  const match = item.message.match(/^(.*) Mã ưu đãi cá nhân của bạn:\s*([^\.]+)\.$/u);
  return {
    // Campaign title/body are administrator-authored business content.
    title: [data(item.title)],
    message: match
      ? compact([match[1] ? data(match[1]) : null, match[1] ? text(" ") : null, text("Your personal voucher code: "), data(match[2]), text(".")])
      : [data(item.message)],
  };
}

function staffShift(item: Pick<NotificationItem, "message">, title: string, prefix: string): NotificationPresentation {
  const match = item.message.match(/^[^:]+:\s*(.+?)\s*·\s*(\d{4}-\d{2}-\d{2})\s*·\s*([^\.]+)\.$/u);
  return {
    title: [text(title)],
    message: match
      ? compact([text(prefix), data(match[1]), text(` · ${match[2]} · ${match[3]}.`)])
      : [data(item.message)],
  };
}

function staffReminder(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const match = item.message.match(/^Ca làm tại (.+) bắt đầu lúc ([^\s]+) ngày (\d{4}-\d{2}-\d{2})\./u);
  return {
    title: [text("Your shift starts soon")],
    message: match
      ? compact([text("Your shift at "), data(match[1]), text(` starts at ${match[2]} on ${match[3]}. Please be ready to check in on time.`)])
      : [data(item.message)],
  };
}

function staffLeave(item: Pick<NotificationItem, "message">, approved: boolean): NotificationPresentation {
  const match = item.message.match(/^Đơn nghỉ (\d{4}-\d{2}-\d{2}) đến (\d{4}-\d{2}-\d{2}) đã (?:được duyệt|bị từ chối)(?:\. Ghi chú:\s*(.*))?$/u);
  return {
    title: [text("Leave request result")],
    message: match
      ? compact([
          text(`Your leave request from ${match[1]} to ${match[2]} was ${approved ? "approved" : "rejected"}`),
          match[3] ? text(". Note: ") : text("."),
          match[3] ? data(match[3]) : null,
        ])
      : [data(item.message)],
  };
}

function refundRequested(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const amount = item.message.match(/^Yêu cầu hoàn ([^\s]+)đ/u)?.[1];
  return {
    title: [text("Refund request received")],
    message: amount
      ? compact([text("Your refund request for "), data(`${amount}đ`), text(" is waiting for administrator confirmation.")])
      : [data(item.message)],
  };
}

function refundApproved(item: Pick<NotificationItem, "title" | "message">): NotificationPresentation {
  const match = item.message.match(/^Booking\s+([^\s]+)\s+đã ghi nhận hoàn\s+([^\s]+)đ\.\s+Phí hủy:\s+([^\s]+)đ\./u);
  return {
    title: [text(item.title.includes("tự động") ? "Automatic refund completed" : "Refund approved")],
    message: match
      ? compact([text("Booking "), data(match[1]), text(" recorded a refund of "), data(`${match[2]}đ`), text(". Cancellation fee: "), data(`${match[3]}đ`), text(". The seats are available for sale again.")])
      : [data(item.message)],
  };
}

function refundRejected(item: Pick<NotificationItem, "message">): NotificationPresentation {
  const bookingId = item.message.match(/^Yêu cầu hoàn vé cho booking\s+([^\s]+)\s+đã bị từ chối/u)?.[1];
  return {
    title: [text("Refund request not approved")],
    message: bookingId
      ? compact([text("The refund request for booking "), data(bookingId), text(" was rejected. The ticket remains valid.")])
      : [data(item.message)],
  };
}

const SECURITY_COPY: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  "Đăng nhập từ thiết bị chưa tin cậy": ["Sign-in from an untrusted device", "CineBooking detected a new sign-in session. If this was not you, revoke the session and change your password."],
  "Nhiều lần đăng nhập thất bại": ["Multiple failed sign-in attempts", "Brute-force protection has rate-limited sign-in for the account or network address."],
  "Mật khẩu đã được đặt lại": ["Password was reset", "The password was reset through account recovery. All previous sessions were revoked."],
  "Mật khẩu đã được thay đổi": ["Password was changed", "The account password was changed. Other devices were signed out."],
});

export function notificationPresentation(
  item: Pick<NotificationItem, "type" | "title" | "message">,
  language: Language,
): NotificationPresentation {
  if (language === "vi") return fallback(item, language);

  switch (item.type) {
    case "SUPPORT_REPLY": return supportReply(item);
    case "SUPPORT_STATUS": return supportStatus(item);
    case "SHOWTIME_REMINDER_3H": return showtimeReminder(item, false);
    case "SHOWTIME_REMINDER_30M": return showtimeReminder(item, true);
    case "BOOKING_EXPIRED": return bookingInactive(item, true);
    case "BOOKING_CANCELLED": return bookingInactive(item, false);
    case "BOOKING_TRANSFER_RECEIVED": return transferReceived(item);
    case "BOOKING_TRANSFER_SENT": return transferSent(item);
    case "WAITLIST_SEAT_AVAILABLE": return waitlistSeat(item);
    case "NOTIFICATION_TEST": return { title: [text("Notification channel is working")], message: [text("Your in-app notification channel is working normally.")] };
    case "LOYALTY_REWARD": return loyaltyReward(item, language);
    case "LOYALTY_BIRTHDAY": return { title: [text("🎂 Your birthday reward is ready")], message: [text("Your 20% birthday voucher, capped at VND 50,000, is valid for 30 days.")] };
    case "LOYALTY_ADJUST": return loyaltyAdjust(item);
    case "LOYALTY_REWARD_CLAIMED": return loyaltyClaimed(item);
    case "LOYALTY_EXPIRING_SOON": {
      const match = item.message.match(/^(\d+) điểm sẽ bắt đầu hết hạn từ (\d{4}-\d{2}-\d{2})\./u);
      return { title: [text("Loyalty points expire soon")], message: match ? [text(`${match[1]} points will begin expiring on ${match[2]}. Use them for tickets or rewards before the deadline.`)] : [data(item.message)] };
    }
    case "BIRTHDAY_REWARD_AVAILABLE": return { title: [text("Your CineBooking birthday reward is waiting")], message: [text("Happy birthday! Your 20% birthday voucher is ready to claim on the Membership page.")] };
    case "LOYALTY_EXPIRED": {
      const expired = item.title.match(/^(\d+) điểm đã hết hạn$/u)?.[1];
      const balance = item.message.match(/^Số dư hiện tại:\s*(\d+) điểm\.$/u)?.[1];
      return {
        title: expired ? [text(`${expired} points expired`)] : [data(item.title)],
        message: balance ? [text(`Current balance: ${balance} points.`)] : [data(item.message)],
      };
    }
    case "PAYMENT_REVIEW": {
      const bookingId = item.message.match(/booking\s+([^\s]+)\s+không còn/u)?.[1];
      return { title: [text("Payment requires review")], message: bookingId ? compact([text("The gateway reported success after booking "), data(bookingId), text(" was no longer pending. CineBooking will reconcile the transaction.")]) : [data(item.message)] };
    }
    case "PAYMENT_SUCCESS": {
      const bookingId = item.message.match(/^Vé\s+([^\s]+)\s+đã được xác nhận/u)?.[1];
      return { title: [text("Payment successful")], message: bookingId ? compact([text("Ticket "), data(bookingId), text(" is confirmed. You can open its QR code in My Tickets.")]) : [data(item.message)] };
    }
    case "STAFF_SHIFT_ASSIGNED": return staffShift(item, "You have a new shift", "New shift scheduled at ");
    case "STAFF_SHIFT_UPDATED": return staffShift(item, "Your shift changed", "Updated shift at ");
    case "STAFF_SHIFT_CANCELLED": return staffShift(item, "Your shift was cancelled", "Cancelled shift at ");
    case "STAFF_SHIFT_REMINDER": return staffReminder(item);
    case "STAFF_SHIFT_LEAVE_APPROVED": return staffLeave(item, true);
    case "STAFF_SHIFT_LEAVE_REJECTED": return staffLeave(item, false);
    case "REFUND_REQUESTED": return refundRequested(item);
    case "REFUND_APPROVED": return refundApproved(item);
    case "REFUND_REJECTED": return refundRejected(item);
    case "PROMOTION_V64":
    case "PROMOTION_V77": return promotion(item);
    case "SECURITY_ALERT": {
      const copy = SECURITY_COPY[item.title];
      return copy ? { title: [text(copy[0])], message: [text(copy[1])] } : fallback(item, language);
    }
    default: return fallback(item, language);
  }
}

export const SYSTEM_NOTIFICATION_TYPES_WITH_EN_OWNERSHIP = Object.freeze([
  "SUPPORT_REPLY", "SUPPORT_STATUS", "SHOWTIME_REMINDER_3H", "SHOWTIME_REMINDER_30M",
  "BOOKING_EXPIRED", "BOOKING_CANCELLED", "BOOKING_TRANSFER_RECEIVED", "BOOKING_TRANSFER_SENT",
  "WAITLIST_SEAT_AVAILABLE", "NOTIFICATION_TEST", "LOYALTY_REWARD", "LOYALTY_BIRTHDAY",
  "LOYALTY_ADJUST", "LOYALTY_REWARD_CLAIMED", "LOYALTY_EXPIRING_SOON", "BIRTHDAY_REWARD_AVAILABLE",
  "LOYALTY_EXPIRED", "PAYMENT_REVIEW", "PAYMENT_SUCCESS", "STAFF_SHIFT_ASSIGNED", "STAFF_SHIFT_UPDATED",
  "STAFF_SHIFT_CANCELLED", "STAFF_SHIFT_REMINDER", "STAFF_SHIFT_LEAVE_APPROVED", "STAFF_SHIFT_LEAVE_REJECTED",
  "REFUND_REQUESTED", "REFUND_APPROVED", "REFUND_REJECTED", "SECURITY_ALERT",
] as const);
