export type Movie = {
  id:string;
  title:string;
  description?:string;
  durationMinutes:number;
  posterUrl?:string;
  rating?:string;
  releaseDate?:string;
  genre?:string;
  language?:string;
  trailerUrl?:string;
  active:boolean;
  averageRating:number;
  reviewCount:number;
};

export type RecommendationItem = { movie:Movie; score:number; reason:string; matchedGenres:string[] };
export type RecommendationHome = { algorithmVersion:string; personalized:boolean; profileSummary:string; personalizedMovies:RecommendationItem[]; trendingMovies:RecommendationItem[] };
export type Showtime = {
  id:string;
  movieId:string;
  movieTitle:string;
  auditoriumId:string;
  auditoriumName:string;
  cinemaId:string;
  cinemaName:string;
  cinemaAddress:string;
  startTime:string;
  basePrice:number;
  status:string;
};
export type Seat = { id:string; code:string; rowLabel:string; seatNumber:number; seatType:string; basePrice:number; seatModifier:number; dynamicAdjustment:number; price:number; pricingRules:string[]; status:"AVAILABLE"|"HELD"|"BOOKED"|"BLOCKED"; heldByMe:boolean };
export type SeatMap = { showtimeId:string; holdTtlSeconds:number; seats:Seat[] };
export type BookingSeat = { seatId:string; code:string; price:number };
export type BookingConcession = { productId?:string; name:string; unitPrice:number; quantity:number; subtotal:number };
export type Booking = { id:string; showtimeId:string; movieTitle:string; showtimeStart:string; status:string; totalAmount:number; seatAmount:number; concessionAmount:number; discountAmount:number; pointsRedeemed:number; voucherCode?:string; expiresAt?:string; createdAt:string; confirmedAt?:string; checkedInAt?:string; refundRequestedAt?:string; refundedAt?:string; refundAmount?:number; refundReason?:string; seats:BookingSeat[]; concessions:BookingConcession[] };
export type AuthResponse = { accessToken:string; accessExpiresAt:string; sessionId:string; userId:string; email:string; fullName:string; role:string };
export type SecuritySession = { id:string; deviceName:string; ipAddress?:string; createdAt:string; lastSeenAt:string; expiresAt:string; revokedAt?:string; revokeReason?:string; current:boolean; active:boolean };
export type LoginSecurityEvent = { action:string; details?:string; ipAddress?:string; createdAt:string };
export type UserProfile = { id:string; email:string; fullName:string; phone?:string; role:string; loyaltyPoints:number; membershipTier:string; accountEnabled:boolean; createdAt:string; updatedAt:string };
export type PaymentStart = { paymentId:string; bookingId:string; provider:string; paymentUrl:string; qrData?:string; deeplink?:string };
export type PaymentCheckout = { paymentId:string; bookingId:string; provider:string; status:string; paymentUrl?:string; qrData?:string; deeplink?:string };
export type Cinema = { id:string; name:string; address:string };
export type Auditorium = { id:string; cinemaId:string; cinemaName:string; name:string };
export type AdminSeat = { id:string; auditoriumId:string; auditoriumName:string; rowLabel:string; seatNumber:number; seatType:string; priceModifier:number };

export type ShowtimePlanSlot = { startTime:string; endTime:string; creatable:boolean; conflictType?:"SHOWTIME"|"BLACKOUT"|"BATCH"; conflictShowtimeId?:string; conflictBlackoutId?:string; conflictLabel?:string };
export type ShowtimePlanPreview = { zoneId:string; turnaroundMinutes:number; requested:number; creatable:number; conflicts:number; slots:ShowtimePlanSlot[] };
export type ShowtimePlanCommit = { created:number; skipped:number; preview:ShowtimePlanPreview; showtimes:Showtime[] };
export type AuditoriumBlackout = { id:string; auditoriumId:string; cinemaName:string; auditoriumName:string; startTime:string; endTime:string; reason:string; createdAt:string };

export type MovieReview = { id:string; movieId:string; userId:string; userName:string; rating:number; comment?:string; createdAt:string; updatedAt:string; mine:boolean };
export type RatingSummary = { averageRating:number; reviewCount:number };

export type ConcessionProduct = { id:string; name:string; description?:string; price:number; imageUrl?:string; active:boolean; sortOrder:number; inventoryEnabled:boolean; stockOnHand:number; stockReserved:number; stockAvailable:number; lowStockThreshold:number; lowStock:boolean; soldOut:boolean };
export type InventoryProduct = { productId:string; name:string; price:number; active:boolean; inventoryEnabled:boolean; stockOnHand:number; stockReserved:number; stockAvailable:number; lowStockThreshold:number; lowStock:boolean; soldOut:boolean };
export type InventorySummary = { totalProducts:number; trackedProducts:number; totalOnHand:number; totalReserved:number; totalAvailable:number; lowStockProducts:number; soldOutProducts:number; products:InventoryProduct[] };
export type InventoryMovement = { id:string; productId:string; productName:string; bookingId?:string; movementType:"RESTOCK"|"ADJUSTMENT"|"RESERVE"|"RELEASE"|"SALE"|"REFUND"; quantityDelta:number; reservedDelta:number; stockAfter:number; reservedAfter:number; actorEmail?:string; note?:string; createdAt:string };
export type Voucher = { id:string; code:string; name:string; discountType:string; discountValue:number; minOrderAmount:number; maxDiscount?:number; startsAt?:string; endsAt?:string; usageLimit?:number; usedCount:number; active:boolean };
export type VoucherQuote = { code:string; name:string; discountAmount:number; finalAmount:number };
export type NotificationItem = { id:string; type:string; category:string; title:string; message:string; linkUrl?:string; read:boolean; emailStatus:string; createdAt:string };
export type NotificationPreference = { inAppEnabled:boolean; emailEnabled:boolean; browserEnabled:boolean; bookingEnabled:boolean; reminderEnabled:boolean; refundEnabled:boolean; staffShiftEnabled:boolean; promotionEnabled:boolean; updatedAt:string };
export type LoyaltyTransaction = { id:string; bookingId?:string; type:"EARN"|"REDEEM"|"REFUND"|"REVERSAL"; points:number; description?:string; createdAt:string };
export type AnalyticsNameValue = { name:string; value:number; count:number };
export type AnalyticsStatusCount = { status:string; count:number };
export type AnalyticsCinemaPerformance = { cinemaId:string; cinemaName:string; revenue:number; bookings:number; tickets:number; capacity:number; occupancyRate:number };
export type AnalyticsShowtimePerformance = { showtimeId:string; movieTitle:string; cinemaName:string; auditoriumName:string; startTime:string; revenue:number; tickets:number; capacity:number; occupancyRate:number };
export type AnalyticsSeatHeatCell = { rowLabel:string; seatNumber:number; bookings:number; revenue:number };
export type AnalyticsHourlyDemand = { hour:number; bookings:number; tickets:number; revenue:number };
export type AnalyticsStaffPerformance = { userId:string; employeeCode:string; fullName:string; cinemaName:string; checkedTickets:number };
export type AnalyticsDashboard = {
  kpi:{ revenue:number; confirmedBookings:number; users:number; tickets:number; concessionRevenue:number; averageOrderValue:number; occupancyRate:number; paymentSuccessRate:number; refundRate:number; checkIns:number; newUsers:number };
  dailyRevenue:{day:string;revenue:number;bookings:number;tickets:number;checkIns:number}[];
  topMovies:AnalyticsNameValue[]; paymentProviders:AnalyticsNameValue[]; topConcessions:AnalyticsNameValue[];
  cinemaPerformance:AnalyticsCinemaPerformance[]; topShowtimes:AnalyticsShowtimePerformance[]; seatHeatmap:AnalyticsSeatHeatCell[]; hourlyDemand:AnalyticsHourlyDemand[]; staffPerformance:AnalyticsStaffPerformance[];
  bookingStatuses:AnalyticsStatusCount[]; paymentStatuses:AnalyticsStatusCount[];
};

export type AuditItem = { id:string; actorEmail?:string; action:string; entityType?:string; entityId?:string; details?:string; ipAddress?:string; createdAt:string };
export type RefundItem = { bookingId:string; userId:string; showtimeId:string; status:string; totalAmount:number; refundAmount:number; reason?:string; requestedAt?:string; refundedAt?:string };
export type CheckInPreview = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; showtimeStart:string; allowed:boolean; message:string };
export type CheckInResult = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; showtimeStart:string; checkedInAt:string; status:string };
export type CheckInHistoryItem = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; checkedInAt:string; source:"QR"|"URL"|"MANUAL" };
export type TicketInfo = { bookingId:string; status:string; checkedIn:boolean; checkedInAt?:string; qrPayload:string; qrUrl:string; publicBaseUrl:string };

export type StaffAccount = { userId:string; employeeCode:string; email:string; fullName:string; phone?:string; role:"STAFF"|"MANAGER"; cinemaId?:string; cinemaName?:string; jobTitle?:string; employmentStatus:"ACTIVE"|"ON_LEAVE"|"INACTIVE"; hireDate?:string; accountEnabled:boolean; createdAt:string; updatedAt:string };

export type StaffShift = { id:string; staffUserId:string; employeeCode:string; staffName:string; cinemaId:string; cinemaName:string; shiftDate:string; startTime:string; endTime:string; status:"SCHEDULED"|"CANCELLED"|"COMPLETED"; note?:string; checkInAt?:string; checkOutAt?:string; checkedTickets:number; lateMinutes?:number; earlyLeaveMinutes?:number; workedMinutes?:number; punctualityStatus?:"ON_TIME"|"LATE"|"EARLY"|"LATE_EARLY" };
export type StaffAttendance = { id:string; shiftId:string; staffUserId:string; cinemaId:string; cinemaName:string; checkInAt:string; checkOutAt?:string; status:"WORKING"|"COMPLETED"; lateMinutes:number; earlyLeaveMinutes:number; workedMinutes?:number; punctualityStatus:"ON_TIME"|"LATE"|"EARLY"|"LATE_EARLY" };
export type StaffLeaveRequest = { id:string; staffUserId:string; employeeCode:string; staffName:string; cinemaId:string; cinemaName:string; fromDate:string; toDate:string; leaveType:"VACATION"|"SICK"|"PERSONAL"|"OTHER"; reason:string; status:"PENDING"|"APPROVED"|"REJECTED"|"CANCELLED"; reviewedByEmail?:string; reviewedAt?:string; reviewNote?:string; createdAt:string };
export type StaffTimesheetRow = { staffUserId:string; employeeCode:string; staffName:string; cinemaId:string; cinemaName:string; scheduledShifts:number; completedShifts:number; absentShifts:number; scheduledMinutes:number; workedMinutes:number; lateMinutes:number; earlyLeaveMinutes:number; approvedLeaveDays:number };
export type StaffTimesheetReport = { month:string; cinemaId?:string; cinemaName:string; rows:StaffTimesheetRow[]; totalScheduledMinutes:number; totalWorkedMinutes:number; totalLateMinutes:number; totalEarlyLeaveMinutes:number; totalAbsentShifts:number };
export type StaffGateStatus = { canScan:boolean; message:string; attendance?:StaffAttendance };
export type StaffOption = { userId:string; employeeCode:string; fullName:string; role:"STAFF"|"MANAGER"; cinemaId:string; cinemaName:string };

export type AdminBookingPayment = { id:string; provider:string; status:string; amount:number; providerTransactionId?:string; createdAt:string; paidAt?:string };
export type AdminBookingAudit = { id:string; actorEmail?:string; action:string; details?:string; ipAddress?:string; createdAt:string };
export type AdminBookingView = {
  id:string; userId:string; customerName:string; customerEmail:string; customerPhone?:string;
  showtimeId:string; movieTitle:string; cinemaName:string; cinemaAddress:string; auditoriumName:string; showtimeStart:string;
  status:string; totalAmount:number; seatAmount:number; concessionAmount:number; discountAmount:number; pointsRedeemed:number; voucherCode?:string;
  expiresAt?:string; createdAt:string; confirmedAt?:string; checkedInAt?:string; checkedInByEmail?:string;
  refundRequestedAt?:string; refundedAt?:string; refundAmount?:number; refundReason?:string;
  seats:BookingSeat[]; concessions:BookingConcession[]; latestPayment?:AdminBookingPayment; payments:AdminBookingPayment[]; timeline:AdminBookingAudit[];
};
export type AdminBookingActionResult = { message:string; booking:AdminBookingView };
export type AdminTicketInfo = { bookingId:string; qrPayload:string; qrUrl:string; qrImageDataUrl:string };

export type PricingRule = {
  id:string; name:string; cinemaId?:string; cinemaName?:string; auditoriumId?:string; auditoriumName?:string; movieId?:string; movieTitle?:string;
  seatType?:string; daysOfWeek:number[]; startTime?:string; endTime?:string; validFrom?:string; validTo?:string;
  adjustmentType:"FIXED"|"PERCENT"; adjustmentValue:number; priority:number; active:boolean; createdAt:string; updatedAt:string;
};
export type AppliedPricingRule = { ruleId:string; name:string; adjustmentType:"FIXED"|"PERCENT"; adjustmentValue:number; appliedAmount:number; priority:number };
export type PricingQuote = {
  showtimeId:string; seatId:string; seatCode:string; seatType:string; cinemaName:string; auditoriumName:string; movieTitle:string; showtimeStart:string; pricingTimeZone:string;
  basePrice:number; seatModifier:number; priceBeforeDynamic:number; dynamicAdjustment:number; finalPrice:number; appliedRules:AppliedPricingRule[];
};

export type WaitlistStatus = { showtimeId:string; subscribed:boolean; status:"NONE"|"ACTIVE"|"NOTIFIED"|"CANCELLED"|"EXPIRED"; availableSeats:number; createdAt?:string; notifiedAt?:string };
export type WaitlistItem = { id:string; showtimeId:string; movieTitle:string; showtimeStart:string; cinemaName:string; auditoriumName:string; status:"ACTIVE"|"NOTIFIED"|"CANCELLED"|"EXPIRED"; lastAvailableCount:number; createdAt:string; notifiedAt?:string };
