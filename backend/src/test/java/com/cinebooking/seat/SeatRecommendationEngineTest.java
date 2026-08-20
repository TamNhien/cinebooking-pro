package com.cinebooking.seat;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.seat.SeatDtos.*;
import static org.assertj.core.api.Assertions.assertThat;

class SeatRecommendationEngineTest {
    private final SeatRecommendationEngine engine = new SeatRecommendationEngine();

    @Test
    void recommendsCenteredContiguousGroupWithoutSingleGap() {
        List<SeatResponse> seats = row("D", 1, 10, "AVAILABLE");
        List<SeatSuggestion> suggestions = engine.suggest(seats, 2, 5);
        assertThat(suggestions).isNotEmpty();
        assertThat(suggestions.getFirst().seatCodes()).containsExactly("D5", "D6");
        assertThat(suggestions.getFirst().reason()).contains("liền nhau").contains("trung tâm");
    }

    @Test
    void rejectsOnlyNewlyCreatedSingleSeatGap() {
        List<SeatResponse> seats = new ArrayList<>(row("E",1,6,"AVAILABLE"));
        seats.set(0, withStatus(seats.get(0),"BOOKED"));
        seats.set(3, withStatus(seats.get(3),"BOOKED"));
        SelectionValidationResponse result = engine.validate(seats,List.of(seats.get(2).id()));
        assertThat(result.allowed()).isFalse();
        assertThat(result.orphanSeatCodes()).containsExactly("E2");
    }

    @Test
    void doesNotPunishPreExistingSingleGap() {
        List<SeatResponse> seats = new ArrayList<>(row("F",1,7,"AVAILABLE"));
        seats.set(0, withStatus(seats.get(0),"BOOKED"));
        seats.set(2, withStatus(seats.get(2),"BOOKED"));
        SelectionValidationResponse result = engine.validate(seats,List.of(seats.get(5).id()));
        assertThat(result.allowed()).isTrue();
        assertThat(result.orphanSeatCodes()).isEmpty();
    }

    private List<SeatResponse> row(String row, int from, int to, String status) {
        List<SeatResponse> result = new ArrayList<>();
        for(int n=from;n<=to;n++) {
            result.add(new SeatResponse(UUID.randomUUID(),row+n,row,n,"STANDARD",
                    new BigDecimal("90000"),BigDecimal.ZERO,BigDecimal.ZERO,new BigDecimal("90000"),List.of(),status,false));
        }
        return result;
    }

    private SeatResponse withStatus(SeatResponse s, String status) {
        return new SeatResponse(s.id(),s.code(),s.rowLabel(),s.seatNumber(),s.seatType(),s.basePrice(),s.seatModifier(),
                s.dynamicAdjustment(),s.price(),s.pricingRules(),status,false);
    }
}
