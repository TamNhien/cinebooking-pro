package com.cinebooking.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CinemaDisplayNameTest {
    @Test
    void stripsHistoricalTimestampSuffixOnly() {
        assertEquals("CineHub Bình Thạnh", Cinema.cleanDisplayName("CineHub Bình Thạnh 1789224302149"));
        assertEquals("CineHub Bình Thạnh", Cinema.cleanDisplayName("  CineHub Bình Thạnh 1789224302149  "));
        assertEquals("CGV Vincom Center Landmark 81", Cinema.cleanDisplayName("CGV Vincom Center Landmark 81 1789224302149"));
    }

    @Test
    void preservesLegitimateNumericCinemaNames() {
        assertEquals("CGV Vincom Center Landmark 81", Cinema.cleanDisplayName("CGV Vincom Center Landmark 81"));
        assertEquals("CineHub Quận 1", Cinema.cleanDisplayName("CineHub Quận 1"));
        assertEquals("Cinema 2026", Cinema.cleanDisplayName("Cinema 2026"));
    }

    @Test
    void handlesNull() {
        assertNull(Cinema.cleanDisplayName(null));
    }
}
