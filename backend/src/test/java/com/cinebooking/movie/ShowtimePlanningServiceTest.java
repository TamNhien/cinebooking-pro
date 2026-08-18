package com.cinebooking.movie;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class ShowtimePlanningServiceTest {
    @Test void touchingWindowsDoNotOverlap(){
        Instant ten=Instant.parse("2026-09-30T03:00:00Z");
        Instant noon=Instant.parse("2026-09-30T05:00:00Z");
        Instant fourteen=Instant.parse("2026-09-30T07:00:00Z");
        assertFalse(ShowtimePlanningService.overlaps(ten,noon,noon,fourteen));
    }

    @Test void intersectingWindowsOverlap(){
        Instant ten=Instant.parse("2026-09-30T03:00:00Z");
        Instant twelveThirty=Instant.parse("2026-09-30T05:30:00Z");
        Instant noon=Instant.parse("2026-09-30T05:00:00Z");
        Instant fourteen=Instant.parse("2026-09-30T07:00:00Z");
        assertTrue(ShowtimePlanningService.overlaps(ten,twelveThirty,noon,fourteen));
    }
}
