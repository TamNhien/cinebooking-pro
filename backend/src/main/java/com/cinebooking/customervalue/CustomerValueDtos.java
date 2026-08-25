package com.cinebooking.customervalue;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CustomerValueDtos {
    private CustomerValueDtos() {}

    public record CinemaOption(UUID cinemaId, String cinemaName) {}

    public record RfmSegment(
            String code,
            String label,
            String definition,
            long customers,
            BigDecimal realizedLifetimeRevenue,
            double revenueShare
    ) {}

    public record ValueBand(
            String code,
            String label,
            String definition,
            long customers,
            BigDecimal realizedLifetimeRevenue,
            double revenueShare
    ) {}

    public record CustomerValueRow(
            String customerRef,
            LocalDate firstBookingDate,
            LocalDate lastBookingDate,
            long recencyDays,
            long lifetimeBookings,
            BigDecimal realizedLifetimeRevenue,
            int recencyScore,
            int frequencyScore,
            int monetaryScore,
            int rfmTotal,
            String segment
    ) {}

    public record CustomerValueScorecard(
            UUID cinemaId,
            String cinemaName,
            String scope,
            int periodDays,
            LocalDate fromDate,
            LocalDate toDate,
            Instant generatedAt,
            long activeCustomers,
            BigDecimal periodRevenue,
            BigDecimal activeBaseLifetimeRevenue,
            BigDecimal averageLifetimeRevenue,
            double averageLifetimeBookings,
            double medianRecencyDays,
            double top10RevenueShare,
            List<RfmSegment> rfmSegments,
            List<ValueBand> valueBands,
            List<CustomerValueRow> topCustomers
    ) {}
}
