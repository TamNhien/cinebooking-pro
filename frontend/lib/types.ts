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

export type RecommendationScoreComponent = { key:string; label:string; contribution:number; evidence:string };
export type RecommendationItem = { movie:Movie; score:number; confidence:number; reason:string; matchedGenres:string[]; signals:string[]; feedback?:"MORE_LIKE_THIS"|"LESS_LIKE_THIS"|"HIDE"; newToYou:boolean; scoreBreakdown:RecommendationScoreComponent[] };
export type RecommendationTasteGenre = { name:string; score:number };
export type RecommendationTasteFacet = { name:string; score:number };
export type RecommendationMode = "FAMILIAR"|"BALANCED"|"DISCOVERY";
export type RecommendationTasteProfile = { algorithmVersion:string; personalized:boolean; summary:string; topGenres:RecommendationTasteGenre[]; topLanguages:RecommendationTasteFacet[]; preferredCinemaId?:string; preferredCinemaName?:string; preferredDaypart?:string; preferredDaypartLabel?:string; preferredWeekday?:number; preferredWeekdayLabel?:string; preferredDurationBand?:string; preferredDurationLabel?:string; profileStrength:number; signalCount:number; feedbackCount:number; hiddenCount:number };
export type RecommendationHome = { algorithmVersion:string; mode:RecommendationMode; personalized:boolean; profileSummary:string; profile?:RecommendationTasteProfile|null; personalizedMovies:RecommendationItem[]; trendingMovies:RecommendationItem[]; evidencePolicy:string[] };
export type RecommendationFeedbackResponse = { movieId:string; feedbackType:"MORE_LIKE_THIS"|"LESS_LIKE_THIS"|"HIDE"; message:string };
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
  planningSource?:"MANUAL"|"BATCH"|"SMART";
  planningRunId?:string;
  planningScore?:number;
};
export type Seat = { id:string; code:string; rowLabel:string; seatNumber:number; seatType:string; basePrice:number; seatModifier:number; dynamicAdjustment:number; price:number; pricingRules:string[]; status:"AVAILABLE"|"HELD"|"BOOKED"|"BLOCKED"; heldByMe:boolean };
export type SeatMap = { showtimeId:string; holdTtlSeconds:number; holdRemainingSeconds:number; serverEpochMs:number; holdExpiresAtEpochMs:number; maxSelectableSeats:number; preventSingleGap:boolean; seats:Seat[]; holdAuthority?:"POSTGRESQL_WITH_REDIS_MIRROR"|string };
export type SeatSuggestion = { seatIds:string[]; seatCodes:string[]; totalPrice:number; dynamicAdjustment:number; score:number; centerScore:number; rowScore:number; orphanSafetyScore:number; qualityLabel:"BEST"|"GREAT"|"GOOD"|string; reason:string };
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
export type PaymentGatewayReadinessV60 = { provider:string; displayName:string; configured:boolean; mode:string; productionReady:boolean; blockers:string[]; warnings:string[]; checkoutHost:string; queryHost:string; returnHost:string; ipnHost:string };
export type PaymentProductionReadinessV60 = { guardEnabled:boolean; allRemoteProductionReady:boolean; evaluatedAt:string; gateways:PaymentGatewayReadinessV60[] };
export type PaymentEventItem = { id:string; paymentId:string; eventType:string; actorType:string; actorRef?:string; fromStatus?:string; toStatus?:string; code?:string; message?:string; detailsJson?:string; createdAt:string };
export type PaymentAdminView = { id:string; bookingId:string; payerUserId:string; provider:string; status:string; amount:number; providerOrderId?:string; providerTransactionId?:string; responseCode?:string; message?:string; createdAt:string; updatedAt:string; expiresAt?:string; paidAt?:string; failedAt?:string; cancelledAt?:string; lastWebhookAt?:string; attemptNo:number; retryOfPaymentId?:string; lastReconciledAt?:string; nextReconcileAt?:string; reconciliationFailures:number; lastReconcileMessage?:string };
export type PaymentWebhookAdminView = { id:string; provider:string; eventKey:string; paymentId?:string; payloadHash:string; signatureValid:boolean; resultCode?:string; responseCode?:string; responseMessage?:string; receivedAt:string; processedAt?:string; deliveryState:string; recoveryAttempts:number; lastRecoveryAt?:string; recoveredAt?:string; recoveryMessage?:string };
export type PaymentOpsDashboard = { total:number; pending:number; success:number; failed:number; expired:number; cancelled:number; review:number; refunded:number; invalidWebhooks:number; webhookEvents:number; dueReconcile:number; readiness:PaymentProductionReadinessV60; providers:PaymentProviderAvailability[]; payments:PaymentAdminView[]; webhooks:PaymentWebhookAdminView[] };
export type PaymentReconciliationResult = { paymentId:string; provider:string; localStatus:string; providerStatus:string; providerTransactionId?:string; message:string; changed:boolean; success:boolean; trigger:string };
export type PaymentBatchReconciliationResult = { scanned:number; succeeded:number; failed:number; results:PaymentReconciliationResult[] };
export type PaymentTimelineAdmin = { paymentId:string; events:PaymentEventItem[] };
export type PaymentWebhookRecoveryItemV67 = { id:string; provider:string; eventKey:string; paymentId?:string; signatureValid:boolean; deliveryState:string; recoveryAttempts:number; recoveryMessage?:string; receivedAt:string; processedAt?:string; lastRecoveryAt?:string; recoveredAt?:string };
export type PaymentResilienceSummaryV67 = { strategyVersion:string; evaluatedAt:string; autoReconcileEnabled:boolean; webhookRecoveryEnabled:boolean; reconcileScanMs:number; reconcileMinAgeSeconds:number; reconcileMaxBatch:number; reconcileMaxBackoffSeconds:number; webhookRecoveryMaxAttempts:number; dueReconcile:number; remotePendingOrReview:number; webhookOrphaned:number; webhookRecoveryPending:number; webhookDeadLetter:number; webhookRecovered:number; refundRequested:number; refundEvidenceRequired:number; refundSettled:number; refundFailed:number; recoveryQueue:PaymentWebhookRecoveryItemV67[] };
export type PaymentWebhookRecoveryResultV67 = { webhookId:string; paymentId?:string; provider:string; deliveryState:string; recoveryAttempts:number; linked:boolean; recovered:boolean; message:string; reconciliation?:PaymentReconciliationResult };
export type PaymentWebhookRecoveryBatchResultV67 = { scanned:number; recovered:number; pending:number; deadLetter:number; results:PaymentWebhookRecoveryResultV67[] };

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
export type SmartShowtimeSlot = { auditoriumId:string; auditoriumName:string; startTime:string; endTime:string; score:number; historicalOccupancy:number; historicalSamples:number; reasons:string[] };
export type SmartShowtimeDay = { date:string; target:number; suggested:number; conflicts:number; candidateCount:number; slots:SmartShowtimeSlot[] };
export type SmartShowtimePlanPreview = { strategyVersion:string; zoneId:string; turnaroundMinutes:number; minMovieSpacingMinutes:number; cinemaId:string; cinemaName:string; movieId:string; movieTitle:string; requested:number; suggested:number; conflicts:number; candidateCount:number; historicalSamples:number; days:SmartShowtimeDay[] };
export type SmartShowtimeCommit = { planningRunId:string; created:number; preview:SmartShowtimePlanPreview; showtimes:Showtime[] };
export type ShowtimePlanningRun = { id:string; cinemaId:string; cinemaName:string; movieId:string; movieTitle:string; fromDate:string; toDate:string; targetPerDay:number; operatingStart:string; operatingEnd:string; intervalMinutes:number; basePrice:number; requestedSlots:number; suggestedSlots:number; conflictCount:number; historicalSamples:number; strategy:string; status:string; createdBy?:string; createdAt:string; committedAt?:string };
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
export type AnalyticsPeriodWindow = { from:string; to:string; revenue:number; bookings:number; tickets:number; occupancyRate:number };
export type AnalyticsPeriodComparison = { current:AnalyticsPeriodWindow; previous:AnalyticsPeriodWindow; revenueDeltaPct:number; bookingsDeltaPct:number; ticketsDeltaPct:number; occupancyDeltaPoints:number };
export type AnalyticsForecastPoint = { day:string; revenue:number; confidence:number; matchingWeekdays:number };
export type AnalyticsRevenueForecast = { algorithm:string; generatedFor:string; next7DaysRevenue:number; points:AnalyticsForecastPoint[] };
export type AnalyticsMarginSummary = { revenue:number; ticketRevenue:number; concessionRevenue:number; concessionCost:number|null; grossMargin:number|null; grossMarginRate:number|null; costCoverageRate:number; concessionUnits:number; costedUnits:number };
export type AnalyticsAuditoriumPerformance = { auditoriumId:string; auditoriumName:string; cinemaId:string; cinemaName:string; revenue:number; bookings:number; tickets:number; capacity:number; occupancyRate:number };
export type AnalyticsConcessionCostBasis = { cinemaId:string; cinemaName:string; productId:string; productName:string; sellingPrice:number; unitCost:number|null; costKnown:boolean; updatedAt:string|null };
export type AnalyticsMissingCostBasisItemV75Patch = { cinemaId:string; cinemaName:string; productId:string|null; productName:string; missingUnits:number; affectedRevenue:number; lastConfirmedAt:string|null; actionable:boolean };
export type AnalyticsMissingCostCoverageV75Patch = { strategyVersion:string; windowDays:number; windowStart:string; windowEnd:string; missingUnits:number; affectedRevenue:number; affectedProductBranches:number; items:AnalyticsMissingCostBasisItemV75Patch[] };
export type AnalyticsSnapshot = { id:string; cinemaId:string; cinemaName:string; periodKind:"DAILY"|"WEEKLY"|"MONTHLY"; periodStart:string; periodEnd:string; revenue:number; ticketRevenue:number; concessionRevenue:number; concessionCost:number|null; grossMargin:number|null; bookings:number; tickets:number; capacity:number; occupancyRate:number; costCoverageRate:number; forecastNext7d:number; forecastAlgorithm:string; generatedAt:string };
export type AnalyticsDashboard = {
  kpi:{ revenue:number; confirmedBookings:number; users:number; tickets:number; concessionRevenue:number; averageOrderValue:number; occupancyRate:number; paymentSuccessRate:number; refundRate:number; checkIns:number; newUsers:number };
  dailyRevenue:{day:string;revenue:number;bookings:number;tickets:number;checkIns:number}[];
  topMovies:AnalyticsNameValue[]; paymentProviders:AnalyticsNameValue[]; topConcessions:AnalyticsNameValue[];
  cinemaPerformance:AnalyticsCinemaPerformance[]; topShowtimes:AnalyticsShowtimePerformance[]; seatHeatmap:AnalyticsSeatHeatCell[]; hourlyDemand:AnalyticsHourlyDemand[]; staffPerformance:AnalyticsStaffPerformance[];
  bookingStatuses:AnalyticsStatusCount[]; paymentStatuses:AnalyticsStatusCount[];
  periodComparison:AnalyticsPeriodComparison; forecast:AnalyticsRevenueForecast; margin:AnalyticsMarginSummary; auditoriumPerformance:AnalyticsAuditoriumPerformance[]; concessionCostBasis:AnalyticsConcessionCostBasis[]; snapshots:AnalyticsSnapshot[];
};

export type AuditItem = { id:string; actorEmail?:string; action:string; entityType?:string; entityId?:string; details?:string; ipAddress?:string; createdAt:string };
export type RefundItem = { bookingId:string; userId:string; showtimeId:string; status:string; totalAmount:number; refundAmount:number; feeAmount:number; ratePercent:number; policyCode?:string; automatic:boolean; reason?:string; requestedAt?:string; refundedAt?:string; processedAt?:string; processedBy?:string; providerReference?:string };
export type CheckInPreview = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; showtimeStart:string; allowed:boolean; message:string };
export type CheckInResult = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; showtimeStart:string; checkedInAt:string; status:string };
export type CheckInHistoryItem = { bookingId:string; movieTitle:string; cinemaName:string; auditoriumName:string; checkedInAt:string; source:"QR"|"URL"|"MANUAL" };
export type TicketInfo = { bookingId:string; status:string; ticketVersion:number; checkedIn:boolean; checkedInAt?:string; qrPayload:string; qrUrl:string; publicBaseUrl:string };

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
export type DynamicPricingSignalV62 = { code:string; label:string; adjustmentPercent:number; evidence:string; window:string };
export type DynamicPricingStrategyRuleV62 = { code:string; label:string; condition:string; adjustmentPercent:number; explanation:string };
export type DynamicPricingStrategyV62 = { strategyVersion:string; enabled:boolean; maxDiscountPercent:number; maxSurchargePercent:number; referencePricePolicy:string; snapshotPolicy:string; rules:DynamicPricingStrategyRuleV62[] };
export type DynamicPricingSimulationV62 = { strategyVersion:string; enabled:boolean; occupancyRate:number; bookingAttempts30m:number; leadTimeHours:number; referencePrice:number; rawAdjustmentPercent:number; boundedAdjustmentPercent:number; adjustmentAmount:number; simulatedPrice:number; signals:DynamicPricingSignalV62[] };
export type PricingQuote = {
  showtimeId:string; seatId:string; seatCode:string; seatType:string; cinemaName:string; auditoriumName:string; movieTitle:string; showtimeStart:string; pricingTimeZone:string;
  basePrice:number; seatModifier:number; priceBeforeDynamic:number; manualDynamicAdjustment:number; intelligenceAdjustment:number; intelligencePercent:number; dynamicAdjustment:number; finalPrice:number;
  occupancyRate:number; activeSeatReservations:number; sellableSeats:number; bookingAttempts30m:number; leadTimeHours:number; strategyVersion:string; intelligenceSignals:DynamicPricingSignalV62[]; appliedRules:AppliedPricingRule[];
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

// V52 PWA / Mobile Experience 3.0
export type PwaPushConfig = { enabled:boolean; vapidPublicKey:string; ttlSeconds:number; deliveryMode:"VAPID_BACKGROUND"|"FOREGROUND_FALLBACK" };
export type PwaDevice = { id:string; deviceKey:string; deviceLabel:string; platform:string; standalone:boolean; pushEnabled:boolean; failureCount:number; lastSeenAt:string; lastPushAt?:string; lastFailureAt?:string; createdAt:string; updatedAt:string; current:boolean };

// V53 Operations Command Center 3.0
export type CommandCenterCinemaV53 = { cinemaId:string; cinemaName:string };
export type CommandCenterAttentionV53 = { severity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"; domain:string; title:string; count:number; href:string };
export type CommandCenterSummaryV53 = {
  cinemaId?:string; cinemaName:string; scope:"ALL_CINEMAS"|"CINEMA"; status:"HEALTHY"|"WATCH"|"ACTION_REQUIRED"; generatedAt:string;
  todayRevenue:number; todayConfirmedBookings:number; todayTickets:number; todayOccupancyRate:number; forecastNext7d:number;
  paymentReviewCount:number; openSupportCases:number; overdueSupportCases:number; openMaintenanceOrders:number; overdueMaintenanceOrders:number;
  openStaffIncidents:number; lowStockItems:number; soldOutItems:number; attention:CommandCenterAttentionV53[];
};

// V54 Multi-Cinema Performance Benchmarking 3.0
export type PerformanceCinemaV54 = { cinemaId:string; cinemaName:string };
export type PerformanceBranchV54 = {
  cinemaId:string; cinemaName:string; revenueRank:number; revenue:number; previousRevenue:number; revenueDeltaPct:number|null;
  revenueSharePct:number; bookings:number; tickets:number; occupiedSeats:number; capacity:number; occupancyRate:number; averageOrderValue:number; forecastNext7d:number;
};
export type PerformanceMovieV54 = { movieId:string; movieTitle:string; revenue:number; tickets:number };
export type PerformanceDailyV54 = { day:string; revenue:number; bookings:number; tickets:number };
export type PerformanceScorecardV54 = {
  cinemaId?:string; cinemaName:string; scope:"ALL_CINEMAS"|"CINEMA"; periodDays:7|30; fromDate:string; toDate:string; generatedAt:string;
  revenue:number; previousRevenue:number; revenueDeltaPct:number|null; bookings:number; tickets:number; occupancyRate:number; averageOrderValue:number; forecastNext7d:number;
  branches:PerformanceBranchV54[]; topMovies:PerformanceMovieV54[]; daily:PerformanceDailyV54[];
};

// V55 Customer Retention & Cohort Intelligence 3.0
export type RetentionCinemaV55 = { cinemaId:string; cinemaName:string };
export type RetentionLifecycleV55 = { code:"NEW_30D"|"ACTIVE_REPEAT"|"AT_RISK"|"DORMANT"|"LAPSED"; label:string; definition:string; customers:number };
export type RetentionCohortV55 = { cohortMonth:string; acquiredCustomers:number; returnedWithin30Days:number; retention30dRate:number };
export type RetentionDailyV55 = { day:string; newCustomers:number; returningCustomers:number; bookings:number; revenue:number };
export type RetentionScorecardV55 = {
  cinemaId?:string; cinemaName:string; scope:"ALL_CINEMAS"|"CINEMA"; periodDays:30|90; fromDate:string; toDate:string; generatedAt:string;
  activeCustomers:number; newCustomers:number; returningCustomers:number; repeatCustomers:number; repeatCustomerRate:number; bookings:number; bookingsPerCustomer:number;
  revenue:number; revenuePerCustomer:number; lifecycle:RetentionLifecycleV55[]; cohorts:RetentionCohortV55[]; daily:RetentionDailyV55[];
};

export type CustomerValueCinemaV56 = { cinemaId:string; cinemaName:string };
export type CustomerValueRfmSegmentV56 = { code:"CHAMPIONS"|"LOYAL"|"NEW_RECENT"|"HIGH_VALUE"|"NEEDS_ATTENTION"|"DEVELOPING"; label:string; definition:string; customers:number; realizedLifetimeRevenue:number; revenueShare:number };
export type CustomerValueBandV56 = { code:"TOP_10"|"NEXT_15"|"MIDDLE_25"|"LONG_TAIL"; label:string; definition:string; customers:number; realizedLifetimeRevenue:number; revenueShare:number };
export type CustomerValueRowV56 = { customerRef:string; firstBookingDate:string; lastBookingDate:string; recencyDays:number; lifetimeBookings:number; realizedLifetimeRevenue:number; recencyScore:number; frequencyScore:number; monetaryScore:number; rfmTotal:number; segment:CustomerValueRfmSegmentV56["code"] };
export type CustomerValueScorecardV56 = {
  cinemaId?:string; cinemaName:string; scope:"ALL_CINEMAS"|"CINEMA"; periodDays:90|365; fromDate:string; toDate:string; generatedAt:string;
  activeCustomers:number; periodRevenue:number; activeBaseLifetimeRevenue:number; averageLifetimeRevenue:number; averageLifetimeBookings:number; medianRecencyDays:number; top10RevenueShare:number;
  rfmSegments:CustomerValueRfmSegmentV56[]; valueBands:CustomerValueBandV56[]; topCustomers:CustomerValueRowV56[];
};

// V58 Operations Control Center
export type OperationsControlCinemaV58 = { cinemaId:string; cinemaName:string };
export type OperationsControlDomainV58 = { domain:"PAYMENT"|"BOOKING"|"EQUIPMENT"|"STAFF"|"SUPPORT"|"INVENTORY"|"INCIDENT"; label:string; status:"HEALTHY"|"WATCH"|"ACTION_REQUIRED"; primaryCount:number; warningCount:number; href:string };
export type OperationsControlAlertV58 = { severity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"; domain:string; title:string; detail:string; count:number; href:string };
export type OperationsControlSnapshotV58 = {
  cinemaId?:string; cinemaName:string; scope:"ALL_CINEMAS"|"CINEMA"; overallStatus:"HEALTHY"|"WATCH"|"ACTION_REQUIRED"; generatedAt:string; pollAfterSeconds:number;
  todayRevenue:number; todayConfirmedBookings:number; todayTickets:number; todayOccupancyRate:number;
  paymentReviewCount:number; paymentFailedLastHour:number; pendingBookings:number; pendingBookingsPastDue:number; pendingBookingsExpiringSoon:number;
  equipmentOutOfService:number; equipmentDegraded:number; equipmentInMaintenance:number; equipmentServiceOverdue:number;
  staffWorkingNow:number; staffScheduledToday:number; uncoveredActiveShifts:number;
  openSupportCases:number; overdueSupportCases:number; lowStockItems:number; soldOutItems:number; openIncidents:number; criticalIncidents:number;
  domains:OperationsControlDomainV58[]; alerts:OperationsControlAlertV58[];
};

// V59 Realtime Operations 4.0
export type OperationsControlAlertStateV59 = "OPEN"|"ACKNOWLEDGED"|"RESOLVED";
export type OperationsControlAlertV59 = {
  fingerprint:string; severity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"; effectiveSeverity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"; state:OperationsControlAlertStateV59;
  domain:string; title:string; detail:string; count:number; href:string; firstSeenAt:string; stateChangedAt?:string; stateActor?:string; escalated:boolean;
};
export type OperationsControlHistoryV59 = { id:string; fingerprint:string; action:string; actorEmail?:string; detail?:string; createdAt:string };
export type OperationsControlSnapshotV59 = Omit<OperationsControlSnapshotV58,"alerts"> & {
  realtimeTransport:"STOMP_WEBSOCKET"; realtimeTopic:string; alerts:OperationsControlAlertV59[];
};


// V61 Fraud & Risk Intelligence
export type FraudRiskRuleV61 = { code:string; label:string; window:string; maxPoints:number; explanation:string };
export type FraudRiskSignalV61 = { code:string; label:string; points:number; evidence:string; window:string };
export type FraudRiskCustomerV61 = {
  userId:string; customerRef:string; fullName:string; email:string; accountEnabled:boolean; riskScore:number; riskLevel:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; disposition:"UNREVIEWED"|"CLEARED"|"REVIEW"|"CHALLENGE"|"BLOCK_RECOMMENDED";
  bookings30m:number; bookings24h:number; failedPayments24h:number; paymentAttempts24h:number; voucherRedemptions24h:number; refunds30d:number; securityAlerts7d:number; maxSecurityRisk7d:number; failedLogins1h:number; distinctLoginIps24h:number; lastActivityAt?:string|null; signals:FraudRiskSignalV61[];
};
export type FraudRiskSummaryV61 = { totalCustomers:number; watchCustomers:number; highRiskCustomers:number; criticalCustomers:number; customersWithPaymentFailureSignal:number; customersWithVelocitySignal:number; customersWithSecuritySignal:number; generatedAt:string; scoringVersion:string };
export type FraudRiskScorecardV61 = { summary:FraudRiskSummaryV61; rules:FraudRiskRuleV61[]; customers:FraudRiskCustomerV61[] };

// V64 CRM & Marketing Automation 4.0
export type MarketingSegmentCodeV64 = "ALL_ELIGIBLE"|"NEW_30D"|"ENGAGED_30D"|"VIP"|"AT_RISK_31_90D"|"LAPSED_90D_PLUS"|"PROSPECT_NO_BOOKING";
export type MarketingSegmentV64 = { code:MarketingSegmentCodeV64; label:string; definition:string; customers:number; recommendedAction:string; defaultDiscountPercent:number };
export type MarketingOverviewV64 = { strategyVersion:string; generatedAt:string; eligibleCustomers:number; segments:MarketingSegmentV64[] };
export type MarketingAudienceV64 = { customerRef:string; maskedEmail:string; membershipTier:string; lastBookingDate?:string; recencyDays:number; lifetimeBookings:number; lifetimeRevenue:number };
export type MarketingCampaignRequestV64 = { campaignCode:string; segmentCode:MarketingSegmentCodeV64; title:string; message:string; discountType:"PERCENT"|"FIXED"; discountValue:number; minOrderAmount:number; maxDiscount?:number; validityDays:number; confirmed:boolean };
export type MarketingCampaignPreviewV64 = { strategyVersion:string; campaignCode:string; segmentCode:MarketingSegmentCodeV64; segmentLabel:string; matchedCustomers:number; previewLimit:number; audience:MarketingAudienceV64[]; voucherPolicy:string; deliveryPolicy:string };
export type MarketingCampaignLaunchV64 = { strategyVersion:string; campaignCode:string; segmentCode:MarketingSegmentCodeV64; matchedCustomers:number; vouchersCreated:number; vouchersReused:number; notificationsCreated:number; notificationsSkipped:number; launchedAt:string };

// V65 · Observability & Reliability 4.0
export type ObservabilitySloV65 = {
  code:string; label:string; status:"PASS"|"WARN"|"FAIL"|"NO_DATA";
  currentValue:number; targetValue:number; unit:string; comparison:">="|"<="|string; sampleCount:number;
};
export type ObservabilityDependencyV65 = { name:string; status:"PASS"|"FAIL"; latencyMs:number; detail:string };
export type ObservabilityRuntimeV65 = { uptimeSeconds:number; heapUsedBytes:number; heapMaxBytes:number; availableProcessors:number; liveThreads:number; activeRequests:number };
export type ObservabilityRequestSampleV65 = { at:string; method:string; path:string; status:number; durationMs:number; traceId:string };
export type ObservabilitySummaryV65 = {
  strategyVersion:string; instanceId:string; generatedAt:string; windowMinutes:number;
  requestsInWindow:number; serverErrorsInWindow:number; availabilityPercent:number; errorRatePercent:number; p95LatencyMs:number;
  overallStatus:"PASS"|"WARN"|"FAIL"|"NO_DATA";
  runtime:ObservabilityRuntimeV65; slos:ObservabilitySloV65[]; dependencies:ObservabilityDependencyV65[];
  recentRequests:ObservabilityRequestSampleV65[]; prometheusPath:string; traceHeader:string; grafanaHint:string;
};

// V66 · Booking Consistency & Seat Locking 4.0
export type SeatHoldItemV66 = {
  id:string; holdToken:string; showtimeId:string; movieTitle:string; seatCode:string; userEmail:string;
  state:"HELD"|"RELEASED"|"EXPIRED"|"CONVERTED"; createdAt:string; refreshedAt:string; expiresAt:string;
  releasedAt?:string|null; convertedBookingId?:string|null; lastEvent:string;
};
export type SeatConsistencySummaryV66 = {
  strategyVersion:string; holdAuthority:string; redisAvailable:boolean; holdTtlSeconds:number;
  activeHolds:number; expiringWithin60Seconds:number; convertedLast24Hours:number; expiredLast24Hours:number;
  releasedLast24Hours:number; conflictsLast24Hours:number; serverTime:string; recentHolds:SeatHoldItemV66[];
};
export type SeatReconcileResultV66 = { expiredRows:number; activeRows:number; mirroredRows:number; redisAvailable:boolean; authority:string };

// V68 Security & Identity 5.0
export type StepUpGrantV68 = { token:string; issuedAt:string; expiresAt:string; ttlSeconds:number; strategyVersion:string };
export type StepUpStatusV68 = { enabled:boolean; active:boolean; expiresAt?:string; ttlSeconds:number; strategyVersion:string };
export type AdminIdentitySecuritySummaryV68 = {
  strategyVersion:string; stepUpEnabled:boolean; stepUpTtlSeconds:number; activeStepUpGrants:number;
  protectedActionGroups:number; tokenStorage:string; cspMode:string; hstsWhenHttps:boolean; generatedAt:string;
};

// V69 Backup & Disaster Recovery 5.0
export type DrBackupEvidenceV69 = {
  id:string; backupKey:string; storageName:string; checksumSha256:string; sizeBytes:number;
  latestFlywayVersion:number; publicTableCount:number; sourceCommit?:string|null; strategyVersion:string;
  createdAt:string; verifiedAt:string; retentionUntil?:string|null; recordedAt:string;
};
export type DrRestoreDrillEvidenceV69 = {
  id:string; drillKey:string; backupId:string; status:"SUCCESS"|"FAILED"; startedAt:string; completedAt:string;
  restoreDurationSeconds?:number|null; rpoSeconds?:number|null; restoredFlywayVersion?:number|null;
  restoredPublicTableCount?:number|null; checksumVerified:boolean; criticalCatalogVerified:boolean;
  message?:string|null; recordedAt:string;
};
export type DisasterRecoverySummaryV69 = {
  strategyVersion:string; evaluatedAt:string; readiness:"READY"|"DEGRADED"|"NO_DATA";
  rpoTargetMinutes:number; rtoTargetMinutes:number; backupRetentionDays:number; drillMaxAgeHours:number;
  verifiedBackupCount:number; successfulDrillCount:number; latestBackupAgeMinutes?:number|null; latestDrillAgeHours?:number|null;
  backupFresh:boolean; drillFresh:boolean; rtoMet:boolean; immutableEvidence:boolean;
  latestBackup?:DrBackupEvidenceV69|null; latestSuccessfulDrill?:DrRestoreDrillEvidenceV69|null; criticalCatalog:string[];
};

// V70 Data Governance & Privacy 5.0
export type RetentionPolicyV70 = {
  id:string; policyKey:string; dataClass:string; tableName:string; retentionDays:number; retentionAction:"REVIEW"|"ANONYMIZE"|"DELETE"; enabled:boolean; destructiveExecutionEnabled:boolean; note?:string; updatedAt:string;
};
export type PrivacyRequestV70 = {
  id:string; requestKey:string; subjectUserId:string; subjectEmail:string; subjectName:string; requestType:"EXPORT"|"ERASURE"|"RECTIFICATION"; status:"OPEN"|"APPROVED"|"REJECTED"|"COMPLETED"|"CANCELLED"; requestedByEmail?:string; reviewedByEmail?:string; reason:string; reviewNote?:string; dueAt:string; createdAt:string; reviewedAt?:string; completedAt?:string; overdue:boolean;
};
export type SubjectInventoryItemV70 = { dataDomain:string; source:string; recordCount:number; handling:string };
export type SubjectInventoryV70 = { userId:string; email:string; fullName:string; generatedAt:string; totalRelatedRecords:number; items:SubjectInventoryItemV70[]; destructiveActionPerformed:boolean };
export type PrivacyGovernanceSummaryV70 = {
  strategyVersion:string; generatedAt:string; requestSlaHours:number; retentionExecutionEnabled:boolean; dryRunOnly:boolean; policyCount:number; enabledPolicyCount:number; openRequestCount:number; approvedRequestCount:number; overdueRequestCount:number; latestRequest?:PrivacyRequestV70|null; policyStatement:string;
};

// V71 Secrets & Key Governance 5.0
export type SecretRotationPolicyV71 = {
  id:string; policyKey:string; secretName:string; secretClass:"AUTH"|"MAIL"|"PAYMENT"|"PUSH"|"INFRA"; ownerTeam:string;
  rotationDays:number; enabled:boolean; autoRotationEnabled:boolean; requiredWhen?:string|null; note?:string|null;
  configured:boolean; lastRotatedAt?:string|null; nextRotationDueAt?:string|null; rotationStatus:"DISABLED"|"NO_EVIDENCE"|"HEALTHY"|"DUE_SOON"|"OVERDUE";
};
export type SecretRotationEventV71 = {
  id:string; eventKey:string; policyKey:string; eventType:"ROTATED"|"VERIFIED"|"REVOKED"|"INCIDENT"; actorEmail?:string|null;
  providerRef?:string|null; keyFingerprint?:string|null; note?:string|null; occurredAt:string; recordedAt:string;
};
export type KeyGovernanceSummaryV71 = {
  strategyVersion:string; generatedAt:string; warningDays:number; autoRotationExecutionEnabled:boolean; dryRunOnly:boolean;
  enabledPolicyCount:number; configuredSecretCount:number; noEvidenceCount:number; dueSoonCount:number; overdueCount:number;
  posture:"READY"|"REVIEW"|"ACTION_REQUIRED"; storagePolicy:string[]; latestEvent?:SecretRotationEventV71|null;
};

// V72 Software Supply Chain Integrity 5.0
export type SoftwareArtifactEvidenceV72 = {
  id:string; artifactKey:string; artifactType:"BACKEND_JAR"|"FRONTEND_BUNDLE"|"CONTAINER_IMAGE"|"DEPENDENCY_INVENTORY";
  versionLabel:string; sha256:string; sourceCommit?:string|null; buildRef?:string|null; sbomRef?:string|null;
  actorEmail?:string|null; note?:string|null; artifactCreatedAt:string; recordedAt:string;
};
export type SoftwareSupplyChainScanV72 = {
  id:string; scanKey:string; artifactKey:string; artifactType:string; scanner:string; scannerVersion?:string|null; reportFingerprint:string;
  criticalCount:number; highCount:number; mediumCount:number; lowCount:number; decision:"PASS"|"WARN"|"FAIL";
  actorEmail?:string|null; note?:string|null; scannedAt:string; recordedAt:string;
};
export type SupplyChainSummaryV72 = {
  strategyVersion:string; generatedAt:string; evidenceMaxAgeHours:number; maxCritical:number; maxHigh:number;
  releaseGateEnforcementEnabled:boolean; advisoryOnly:boolean; artifactCount:number; scanCount:number; failedScanCount:number;
  warningScanCount:number; latestEvidenceFresh:boolean; posture:"NO_EVIDENCE"|"READY"|"REVIEW"|"ACTION_REQUIRED";
  evidencePolicy:string[]; latestArtifact?:SoftwareArtifactEvidenceV72|null; latestScan?:SoftwareSupplyChainScanV72|null;
};

// V74 Reliability & Resilience 5.0
export type ReliabilityBurnWindowV74 = {
  code:"FAST"|"SLOW"; windowMinutes:number; requests:number; serverErrors:number; availabilityPercent:number;
  errorRatePercent:number; allowedErrorPercent:number; burnRate:number; alertThreshold:number; sampleBufferTruncated:boolean;
  status:"NO_DATA"|"PARTIAL"|"HEALTHY"|"WATCH"|"ALERT";
};
export type ReliabilityIncidentV74 = {
  id:string; source:"STAFF_INCIDENT"|"AUDIT_LOG"|"RUNTIME_5XX"|string; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"|string;
  status:string; title:string; detail:string; occurredAt:string; href:string; evidenceRef:string;
};
export type ReliabilityRunbookStepV74 = { order:number; code:string; title:string; objective:string; command:string; safety:string };
export type ReliabilitySummaryV74 = {
  strategyVersion:string; generatedAt:string; posture:"HEALTHY"|"WATCH"|"ACTION_REQUIRED"|"NO_DATA";
  availabilityTargetPercent:number; errorBudgetPercent:number; fastWindow:ReliabilityBurnWindowV74; slowWindow:ReliabilityBurnWindowV74;
  multiWindowBurnAlert:boolean; burnAlertSeverity:"NONE"|"HIGH"|"CRITICAL"; openIncidents:number; criticalOpenIncidents:number;
  dependencyStatus:"HEALTHY"|"DEGRADED"; disasterRecoveryReadiness:"READY"|"DEGRADED"|"NO_DATA";
  failoverAutomationRequiresExplicitExecute:boolean; evidencePolicy:string[];
};

// V75 Analytics & BI 5.0
export type AnalyticsBiFunnelStageV75 = {
  code:"BOOKING_ATTEMPT"|"CONFIRMED"|"PAYMENT_ATTEMPT"|"PAID"|"CHECKED_IN";
  label:string; count:number; conversionFromPreviousPercent:number; conversionFromStartPercent:number;
};
export type AnalyticsBiFunnelV75 = { definition:string; stages:AnalyticsBiFunnelStageV75[] };
export type AnalyticsBiCohortRowV75 = {
  cohortMonth:string; registeredUsers:number; activatedUsers:number; repeat30dUsers:number;
  activationRatePercent:number; repeat30dRatePercent:number; matured30d:boolean;
};
export type AnalyticsBiCustomerLtvV75 = {
  customerRef:string; maskedEmail:string; paidBookings:number; realizedRevenue:number; averageOrderValue:number;
  firstPaidAt?:string|null; lastPaidAt?:string|null;
};
export type AnalyticsBiPaymentConversionV75 = {
  provider:string; attempts:number; successfulAttempts:number; failedAttempts:number; otherAttempts:number;
  successRatePercent:number; successfulAmount:number;
};
export type AnalyticsBiMovieEfficiencyV75 = {
  movieTitle:string; completedShowtimes:number; ticketsSold:number; seatCapacity:number; occupancyRatePercent:number;
  realizedRevenue:number; revenuePerShowtime:number; revenuePerSeatOffered:number;
};
export type AnalyticsBiCinemaEfficiencyV75 = {
  cinemaName:string; completedShowtimes:number; ticketsSold:number; seatCapacity:number; occupancyRatePercent:number;
  realizedRevenue:number; revenuePerShowtime:number; revenuePerSeatOffered:number;
};
export type AnalyticsBiSummaryV75 = {
  strategyVersion:string; generatedAt:string; windowDays:number; windowStart:string; windowEnd:string;
  funnel:AnalyticsBiFunnelV75; cohorts:AnalyticsBiCohortRowV75[]; topCustomersByRealizedLtv:AnalyticsBiCustomerLtvV75[];
  paymentConversion:AnalyticsBiPaymentConversionV75[]; movieEfficiency:AnalyticsBiMovieEfficiencyV75[];
  cinemaEfficiency:AnalyticsBiCinemaEfficiencyV75[]; evidencePolicy:string[];
};

// V76 Recommendation 5.0
export type RecommendationCoverageV76 = { actionableMoviePercent:number; metadataCompletePercent:number; personalizableUserPercent:number; qualityStatus:string };
export type RecommendationMovieMetricV76 = { movieId:string; movieTitle:string; clicks:number; views:number; feedback:number; assistedBookings:number };
export type RecommendationSourceMetricV76 = { source:string; clicks:number; views:number; totalEvents:number };
export type RecommendationAdminSummaryV76 = {
  strategyVersion:string; generatedAt:string; windowDays:number; windowStart:string; windowEnd:string;
  activeMovies:number; actionableMovies:number; metadataCompleteMovies:number; registeredUsers:number; personalizableUsers:number;
  recommendationEvents:number; recommendationClicks:number; recommendationViews:number; explicitFeedback:number;
  moreLikeFeedback:number; lessLikeFeedback:number; hiddenFeedback:number; assistedConfirmedBookings:number; assistedRealizedRevenue:number;
  coverage:RecommendationCoverageV76; topMovies:RecommendationMovieMetricV76[]; topSources:RecommendationSourceMetricV76[]; evidencePolicy:string[];
};

// V77 CRM Automation 5.0
export type CrmPlaybookCodeV77 = "WELCOME_FIRST_BOOKING"|"ENGAGED_CROSS_SELL"|"VIP_REWARD"|"AT_RISK_WINBACK"|"LAPSED_REACTIVATION";
export type CrmPlaybookV77 = {
  code:CrmPlaybookCodeV77; label:string; definition:string; recommendedAction:string; defaultDiscountPercent:number;
  eligibleCustomers:number; contactableCustomers:number; suppressedCustomers:number;
};
export type CrmSuppressionMetricV77 = { reason:string; customers:number };
export type CrmOutcomeV77 = {
  windowDays:number; promotionMessages:number; inAppVisibleMessages:number; readMessages:number; readRatePercent:number;
  assistedConfirmedBookings:number; assistedRealizedRevenue:number;
};
export type CrmAutomationSummaryV77 = {
  strategyVersion:string; generatedAt:string; frequencyCap7d:number; cooldownHours:number;
  eligibleCustomers:number; contactableCustomers:number; suppressedCustomers:number;
  playbooks:CrmPlaybookV77[]; suppressions:CrmSuppressionMetricV77[]; outcome:CrmOutcomeV77; evidencePolicy:string[];
};
export type CrmAutomationRequestV77 = {
  campaignCode:string; playbookCode:CrmPlaybookCodeV77; title:string; message:string; discountType:"PERCENT"|"FIXED";
  discountValue:number; minOrderAmount:number; maxDiscount?:number; validityDays:number; maxRecipients:number; confirmed:boolean;
};
export type CrmAudienceMemberV77 = {
  customerRef:string; maskedEmail:string; membershipTier:string; lastBookingDate?:string|null; recencyDays:number;
  lifetimeBookings:number; lifetimeRevenue:number; promotionNotifications7d:number; lastPromotionAt?:string|null;
  contactable:boolean; suppressionReason?:string|null;
};
export type CrmAutomationPreviewV77 = {
  strategyVersion:string; campaignCode:string; playbookCode:CrmPlaybookCodeV77; playbookLabel:string;
  eligibleCustomers:number; contactableCustomers:number; suppressedCustomers:number; maxRecipients:number; executable:boolean;
  previewLimit:number; audience:CrmAudienceMemberV77[]; voucherPolicy:string; deliveryPolicy:string; safetyPolicy:string;
};
export type CrmAutomationExecutionV77 = {
  strategyVersion:string; campaignCode:string; playbookCode:CrmPlaybookCodeV77; eligibleCustomers:number;
  contactableCustomers:number; suppressedCustomers:number; vouchersCreated:number; vouchersReused:number;
  notificationsCreated:number; notificationsSkipped:number; executedAt:string;
};
