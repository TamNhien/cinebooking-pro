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
export type SeatMap = { showtimeId:string; holdTtlSeconds:number; holdRemainingSeconds:number; maxSelectableSeats:number; preventSingleGap:boolean; seats:Seat[] };
export type SeatSuggestion = { seatIds:string[]; seatCodes:string[]; totalPrice:number; score:number; reason:string };
export type SeatSuggestionResponse = { showtimeId:string; requestedCount:number; suggestions:SeatSuggestion[] };
export type SeatSelectionValidation = { allowed:boolean; orphanSeatCodes:string[]; message:string };
export type BookingSeat = { seatId:string; code:string; price:number };
export type BookingConcession = { productId?:string; name:string; unitPrice:number; quantity:number; subtotal:number };
export type Booking = { id:string; showtimeId:string; movieTitle:string; showtimeStart:string; status:string; totalAmount:number; seatAmount:number; concessionAmount:number; discountAmount:number; pointsRedeemed:number; voucherCode?:string; expiresAt?:string; createdAt:string; confirmedAt?:string; checkedInAt?:string; refundRequestedAt?:string; refundedAt?:string; refundAmount?:number; refundFeeAmount?:number; refundRatePercent?:number; refundPolicyCode?:string; refundAutomatic?:boolean; refundReason?:string; seats:BookingSeat[]; concessions:BookingConcession[] };
export type RefundQuote = { bookingId:string; refundable:boolean; policyCode:string; ratePercent:number; refundAmount:number; feeAmount:number; automatic:boolean; requiresAdmin:boolean; gatewayConfirmationRequired:boolean; minutesBeforeShowtime:number; showtimeStart:string; paymentProvider:string; message:string };
export type TicketTransferEligibility = { allowed:boolean; reason:string; cutoffAt:string; transferCount:number; maxTransfers:number };
export type TicketTransferResult = { bookingId:string; recipientEmail:string; transferredAt:string; ticketVersion:number; message:string };
export type AuthResponse = { accessToken:string; accessExpiresAt:string; sessionId:string; userId:string; email:string; fullName:string; role:string };
export type SecuritySession = { id:string; deviceName:string; ipAddress?:string; createdAt:string; lastSeenAt:string; expiresAt:string; revokedAt?:string; revokeReason?:string; current:boolean; active:boolean };
export type LoginSecurityEvent = { action:string; details?:string; ipAddress?:string; createdAt:string };
export type UserProfile = { id:string; email:string; fullName:string; phone?:string; role:string; loyaltyPoints:number; loyaltyLifetimePoints:number; membershipTier:string; birthDate?:string; accountEnabled:boolean; createdAt:string; updatedAt:string };
export type PaymentStart = { paymentId:string; bookingId:string; provider:string; paymentUrl:string; qrData?:string; deeplink?:string; expiresAt?:string; replayed:boolean; attemptNo:number; retryOfPaymentId?:string };
export type PaymentCheckout = { paymentId:string; bookingId:string; provider:string; status:string; amount:number; paymentUrl?:string; qrData?:string; deeplink?:string; providerOrderId?:string; providerTransactionId?:string; providerResponseCode?:string; providerMessage?:string; createdAt:string; updatedAt:string; expiresAt?:string; paidAt?:string; failedAt?:string; cancelledAt?:string; attemptNo:number; retryOfPaymentId?:string; lastReconciledAt?:string; nextReconcileAt?:string; reconciliationFailures:number; lastReconcileMessage?:string };
export type PaymentHistoryItem = { paymentId:string; bookingId:string; payerUserId:string; movieTitle:string; provider:string; status:string; amount:number; refundedAmount?:number; refundReference?:string; providerOrderId?:string; providerTransactionId?:string; providerResponseCode?:string; providerMessage?:string; createdAt:string; updatedAt:string; expiresAt?:string; paidAt?:string; failedAt?:string; cancelledAt?:string; refundedAt?:string; attemptNo:number; retryOfPaymentId?:string; lastReconciledAt?:string; nextReconcileAt?:string; reconciliationFailures:number };
export type PaymentProviderAvailability = { provider:string; displayName:string; enabled:boolean; configured:boolean; mock:boolean; mode:string; capabilities:string[]; reason:string };
export type PaymentEventItem = { id:string; paymentId:string; eventType:string; actorType:string; actorRef?:string; fromStatus?:string; toStatus?:string; code?:string; message?:string; detailsJson?:string; createdAt:string };
export type PaymentAdminView = { id:string; bookingId:string; payerUserId:string; provider:string; status:string; amount:number; providerOrderId?:string; providerTransactionId?:string; responseCode?:string; message?:string; createdAt:string; updatedAt:string; expiresAt?:string; paidAt?:string; failedAt?:string; cancelledAt?:string; lastWebhookAt?:string; attemptNo:number; retryOfPaymentId?:string; lastReconciledAt?:string; nextReconcileAt?:string; reconciliationFailures:number; lastReconcileMessage?:string };
export type PaymentWebhookAdminView = { id:string; provider:string; eventKey:string; paymentId?:string; payloadHash:string; signatureValid:boolean; resultCode?:string; responseCode?:string; responseMessage?:string; receivedAt:string; processedAt?:string };
export type PaymentOpsDashboard = { total:number; pending:number; success:number; failed:number; expired:number; cancelled:number; review:number; refunded:number; invalidWebhooks:number; webhookEvents:number; dueReconcile:number; providers:PaymentProviderAvailability[]; payments:PaymentAdminView[]; webhooks:PaymentWebhookAdminView[] };
export type PaymentReconciliationResult = { paymentId:string; provider:string; localStatus:string; providerStatus:string; providerTransactionId?:string; message:string; changed:boolean; success:boolean; trigger:string };
export type PaymentBatchReconciliationResult = { scanned:number; succeeded:number; failed:number; results:PaymentReconciliationResult[] };
export type PaymentTimelineAdmin = { paymentId:string; events:PaymentEventItem[] };
export type FinancialLedgerLine = { accountCode:string; direction:"DEBIT"|"CREDIT"; amount:number; currency:"VND" };
export type FinancialLedgerEntry = { id:string; eventKey:string; eventType:"PAYMENT_CAPTURED"|"REFUND_SETTLED"; bookingId?:string; paymentId?:string; userId?:string; description?:string; occurredAt:string; lines:FinancialLedgerLine[] };
export type FinancialReconciliationIssue = { id:string; runId:string; issueType:string; severity:"INFO"|"WARNING"|"CRITICAL"; entityType:string; entityId?:string; expectedValue?:number; actualValue?:number; message:string; status:"OPEN"|"RESOLVED"; createdAt:string; resolvedAt?:string; resolvedBy?:string };
export type FinancialReconciliationRun = { id:string; runKey:string; businessDate:string; status:"RUNNING"|"CLEAN"|"ISSUES"|"FAILED"; paymentCount:number; paymentAmount:number; ledgerCaptureAmount:number; refundCount:number; refundAmount:number; ledgerRefundAmount:number; loyaltyUsersChecked:number; loyaltyMismatchCount:number; issueCount:number; startedBy:string; startedAt:string; finishedAt?:string };
export type FinancialDashboard = { businessDate:string; capturedAmount:number; refundedAmount:number; netAmount:number; latestRun?:FinancialReconciliationRun|null; recentRuns:FinancialReconciliationRun[]; ledgerEntries:FinancialLedgerEntry[]; openIssues:FinancialReconciliationIssue[] };
export type Cinema = { id:string; name:string; address:string };
export type Auditorium = { id:string; cinemaId:string; cinemaName:string; name:string };
export type AdminSeat = { id:string; auditoriumId:string; auditoriumName:string; rowLabel:string; seatNumber:number; seatType:string; priceModifier:number };

export type ShowtimePlanSlot = { startTime:string; endTime:string; creatable:boolean; conflictType?:"SHOWTIME"|"BLACKOUT"|"BATCH"; conflictShowtimeId?:string; conflictBlackoutId?:string; conflictLabel?:string };
export type ShowtimePlanPreview = { zoneId:string; turnaroundMinutes:number; requested:number; creatable:number; conflicts:number; slots:ShowtimePlanSlot[] };
export type ShowtimePlanCommit = { created:number; skipped:number; preview:ShowtimePlanPreview; showtimes:Showtime[] };
export type AuditoriumBlackout = { id:string; auditoriumId:string; cinemaName:string; auditoriumName:string; startTime:string; endTime:string; reason:string; createdAt:string };

export type MovieReview = { id:string; movieId:string; userId:string; userName:string; rating:number; comment?:string; createdAt:string; updatedAt:string; mine:boolean };
export type RatingSummary = { averageRating:number; reviewCount:number };

export type ConcessionProduct = { id:string; name:string; description?:string; price:number; imageUrl?:string; active:boolean; sortOrder:number; inventoryEnabled:boolean; stockOnHand:number; stockReserved:number; stockAvailable:number; lowStockThreshold:number; lowStock:boolean; soldOut:boolean; cinemaId?:string; cinemaName?:string; basePrice?:number; priceOverride?:boolean };
export type InventoryProduct = { productId:string; cinemaId:string; cinemaName:string; name:string; basePrice:number; price:number; priceOverride:boolean; active:boolean; inventoryEnabled:boolean; stockOnHand:number; stockReserved:number; stockAvailable:number; lowStockThreshold:number; targetStock:number; lowStock:boolean; soldOut:boolean };
export type InventorySummary = { cinemaId:string; cinemaName:string; totalProducts:number; trackedProducts:number; totalOnHand:number; totalReserved:number; totalAvailable:number; lowStockProducts:number; soldOutProducts:number; products:InventoryProduct[] };
export type InventoryBranchOverview = { cinemaId:string; cinemaName:string; trackedProducts:number; totalAvailable:number; lowStockProducts:number; soldOutProducts:number };
export type InventoryTransfer = { referenceKey:string; productId:string; productName:string; fromCinemaId:string; fromCinemaName:string; toCinemaId:string; toCinemaName:string; quantity:number; fromAvailable:number; toAvailable:number };
export type InventoryMovement = { id:string; productId:string; productName:string; cinemaId?:string; cinemaName:string; bookingId?:string; movementType:"RESTOCK"|"ADJUSTMENT"|"RESERVE"|"RELEASE"|"SALE"|"REFUND"|"LOYALTY_REWARD"|"WASTE"|"TRANSFER_OUT"|"TRANSFER_IN"; quantityDelta:number; reservedDelta:number; stockAfter:number; reservedAfter:number; actorEmail?:string; referenceKey?:string; note?:string; createdAt:string };
export type Voucher = { id:string; code:string; name:string; discountType:string; discountValue:number; minOrderAmount:number; maxDiscount?:number; startsAt?:string; endsAt?:string; usageLimit?:number; usedCount:number; active:boolean };
export type VoucherQuote = { code:string; name:string; discountAmount:number; finalAmount:number };
export type NotificationItem = { id:string; type:string; category:string; priority:"LOW"|"NORMAL"|"HIGH"; title:string; message:string; linkUrl?:string; read:boolean; readAt?:string; archived:boolean; archivedAt?:string; emailStatus:string; createdAt:string };
export type NotificationPreference = { inAppEnabled:boolean; emailEnabled:boolean; browserEnabled:boolean; bookingEnabled:boolean; reminderEnabled:boolean; refundEnabled:boolean; staffShiftEnabled:boolean; promotionEnabled:boolean; loyaltyEnabled:boolean; waitlistEnabled:boolean; updatedAt:string };
export type LoyaltyTransaction = { id:string; bookingId?:string; type:"EARN"|"REDEEM"|"REFUND"|"REVERSAL"|"EXPIRE"|"REWARD"|"ADJUST_CREDIT"|"ADJUST_DEBIT"; points:number; description?:string; createdAt:string; expiresAt?:string; balanceAfter?:number; referenceType?:string; referenceId?:string };
export type LoyaltySummary = { balancePoints:number; lifetimePoints:number; membershipTier:string; earnMultiplier:number; nextTier?:string; nextTierAt?:number; pointsToNextTier:number; expiringSoonPoints:number; nextExpiryAt?:string; pointExpiryMonths:number; birthDate?:string; birthdayRewardEligible:boolean; birthdayRewardYear?:number };
export type LoyaltyReward = { id:string; code:string; name:string; description?:string; rewardType:"VOUCHER"|"CONCESSION"; pointsCost:number; canRedeem:boolean; discountType?:string; discountValue?:number; minOrderAmount?:number; maxDiscount?:number; validityDays:number; concessionProductId?:string; concessionProductName?:string; concessionQuantity?:number };
export type LoyaltyRedemption = { id:string; rewardId:string; rewardName:string; rewardType:"VOUCHER"|"CONCESSION"|"UNKNOWN"; redemptionCode:string; voucherCode?:string; pointsCost:number; status:"ISSUED"|"CLAIMED"; redeemedAt:string; expiresAt:string; claimedAt?:string };
export type OwnedLoyaltyVoucher = { id:string; code:string; name:string; discountType:string; discountValue:number; minOrderAmount:number; maxDiscount?:number; startsAt?:string; endsAt?:string; active:boolean };
export type BirthdayRewardResult = { claimed:boolean; voucherCode:string; endsAt:string; message:string };
export type AdminLoyaltyMember = { userId:string; email:string; fullName:string; balancePoints:number; lifetimePoints:number; membershipTier:string; expiringSoonPoints:number; nextExpiryAt?:string; birthDate?:string };
export type LoyaltyConcessionClaim = { redemptionCode:string; rewardName:string; customerEmail:string; productName:string; quantity:number; claimedAt:string; message:string };
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
export type RefundItem = { bookingId:string; userId:string; showtimeId:string; status:string; totalAmount:number; refundAmount:number; feeAmount:number; ratePercent:number; policyCode?:string; automatic:boolean; reason?:string; requestedAt?:string; refundedAt?:string; processedAt?:string; processedBy?:string; providerReference?:string };
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
export type StaffOperationsCinema = { id:string; name:string };
export type StaffOperationsStaff = { userId:string; employeeCode:string; fullName:string; role:"STAFF"|"MANAGER" };
export type StaffOperationsLiveCheckIn = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; checkedInAt:string; source:"QR"|"URL"|"MANUAL"; staffName:string };
export type StaffOperationsLive = { cinemaId:string; cinemaName:string; checkedInLast5Minutes:number; checkedInLastHour:number; checkedInToday:number; activeStaff:number; openIncidents:number; generatedAt:string; recentCheckIns:StaffOperationsLiveCheckIn[] };
export type StaffHandover = { id:string; cinemaId:string; cinemaName:string; fromShiftId:string; fromAttendanceId:string; fromStaffUserId:string; fromStaffName:string; toStaffUserId:string; toStaffName:string; summary:string; status:"PENDING"|"ACCEPTED"|"CANCELLED"; createdAt:string; acceptedAt?:string };
export type StaffIncident = { id:string; cinemaId:string; cinemaName:string; shiftId?:string; attendanceId?:string; reportedBy:string; reportedByName:string; category:"CUSTOMER"|"EQUIPMENT"|"SAFETY"|"SECURITY"|"PAYMENT"|"OTHER"; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; title:string; description:string; status:"OPEN"|"RESOLVED"; resolvedBy?:string; resolvedByName?:string; resolvedAt?:string; resolutionNote?:string; createdAt:string; updatedAt:string };
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

export type MaintenanceCinema = { id:string; name:string };
export type MaintenanceAuditorium = { id:string; cinemaId:string; name:string };
export type MaintenanceStaff = { userId:string; employeeCode:string; fullName:string; role:"STAFF"|"MANAGER" };
export type MaintenanceIncident = { id:string; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; category:string; title:string; reportedByName:string; createdAt:string };
export type MaintenanceSummary = { cinemaId:string; cinemaName:string; totalAssets:number; degradedAssets:number; outOfServiceAssets:number; maintenanceAssets:number; openWorkOrders:number; criticalOpenWorkOrders:number; overdueWorkOrders:number; serviceDueNext14Days:number; generatedAt:string };
export type MaintenanceAsset = { id:string; cinemaId:string; cinemaName:string; auditoriumId?:string; auditoriumName?:string; assetCode:string; name:string; category:"PROJECTOR"|"AUDIO"|"HVAC"|"SCREEN"|"POS"|"NETWORK"|"POWER"|"SAFETY"|"OTHER"; status:"OPERATIONAL"|"DEGRADED"|"OUT_OF_SERVICE"|"MAINTENANCE"; vendor?:string; serialNumber?:string; installedOn?:string; lastServiceAt?:string; nextServiceDue?:string; note?:string; createdAt:string; updatedAt:string };
export type MaintenanceWorkOrder = { id:string; cinemaId:string; cinemaName:string; auditoriumId?:string; auditoriumName?:string; assetId?:string; assetCode?:string; assetName?:string; sourceIncidentId?:string; title:string; description:string; priority:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; status:"OPEN"|"IN_PROGRESS"|"BLOCKED"|"RESOLVED"|"CANCELLED"; assignedTo?:string; assignedToName?:string; dueAt?:string; overdue:boolean; resolutionNote?:string; createdBy:string; createdByName:string; startedAt?:string; resolvedAt?:string; resolvedBy?:string; resolvedByName?:string; createdAt:string; updatedAt:string };
export type MaintenanceWorkOrderEvent = { id:string; workOrderId:string; eventType:string; fromStatus?:string; toStatus?:string; note?:string; actorUserId:string; actorName:string; createdAt:string };

export type SupportCinema = { id:string; name:string };
export type SupportStaff = { userId:string; employeeCode:string; fullName:string; role:"STAFF"|"MANAGER"; cinemaId?:string; cinemaName?:string };
export type SupportSummary = { cinemaId:string; cinemaName:string; activeCases:number; waitingCustomer:number; criticalActive:number; overdueSla:number; generatedAt:string };
export type SupportCase = { id:string; caseNumber:string; userId:string; customerName:string; customerEmail:string; bookingId?:string; cinemaId?:string; cinemaName?:string; category:"BOOKING"|"PAYMENT"|"REFUND"|"TICKET"|"CINEMA_EXPERIENCE"|"STAFF"|"OTHER"; priority:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; status:"OPEN"|"IN_PROGRESS"|"WAITING_CUSTOMER"|"RESOLVED"|"CLOSED"; subject:string; description:string; assignedTo?:string; assignedToName?:string; slaDueAt:string; overdue:boolean; resolutionNote?:string; lastCustomerMessageAt:string; lastStaffMessageAt?:string; resolvedAt?:string; closedAt?:string; createdAt:string; updatedAt:string };
export type SupportCaseEvent = { id:string; caseId:string; eventType:string; fromStatus?:string; toStatus?:string; visibility:"CUSTOMER"|"INTERNAL"; message?:string; actorUserId:string; actorName:string; actorRole:string; createdAt:string };

export type SecurityOverviewV46 = { activeSessions:number; trustedDevices:number; unacknowledgedAlerts:number; highRiskAlerts:number; generatedAt:string };
export type TrustedDeviceV46 = { id:string; label:string; deviceName:string; firstIp?:string; lastIp?:string; trustedAt:string; lastSeenAt:string; revokedAt?:string; active:boolean };
export type SecurityAlertV46 = { id:string; eventType:"NEW_DEVICE"|"CREDENTIAL_ATTACK"|"PASSWORD_CHANGED"|"PASSWORD_RESET"|"SESSION_REVOKED"; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; riskScore:number; title:string; details?:string; ipAddress?:string; deviceName?:string; relatedSessionId?:string; acknowledgedAt?:string; createdAt:string };
export type AdminSecuritySummaryV46 = { alertsLast24Hours:number; unacknowledgedAlerts:number; unacknowledgedHighRisk:number; activeTrustedDevices:number; generatedAt:string };
export type AdminSecurityAlertV46 = SecurityAlertV46 & { userId:string; userEmail:string; userName:string };
