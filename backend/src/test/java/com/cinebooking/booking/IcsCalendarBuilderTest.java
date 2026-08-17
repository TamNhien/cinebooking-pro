package com.cinebooking.booking;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class IcsCalendarBuilderTest {
    @Test
    void buildsPortableUtcCalendarEvent() {
        UUID id = UUID.fromString("11111111-2222-3333-4444-555555555555");
        String ics = IcsCalendarBuilder.build(
                id,
                "Hành Trình Sao Hỏa",
                Instant.parse("2026-09-30T12:00:00Z"),
                Instant.parse("2026-09-30T14:10:00Z"),
                "CineBooking Center - Phòng 01, 123 Nguyễn Huệ",
                "Booking #" + id + " | Ghế A1, A2 | CineBooking Pro",
                Instant.parse("2026-08-17T15:00:00Z"));

        assertTrue(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
        assertTrue(ics.contains("UID:" + id + "@cinebooking.local\r\n"));
        assertTrue(ics.contains("DTSTART:20260930T120000Z\r\n"));
        assertTrue(ics.contains("DTEND:20260930T141000Z\r\n"));
        assertTrue(ics.contains("SUMMARY:CineBooking - Hành Trình Sao Hỏa\r\n"));
        assertTrue(ics.endsWith("END:VCALENDAR\r\n"));
    }

    @Test
    void escapesIcsSeparatorsAndNewlines() {
        assertEquals("Rạp\\, A\\; Tầng 2\\nPhòng 01", IcsCalendarBuilder.escape("Rạp, A; Tầng 2\nPhòng 01"));
        assertEquals("C:\\\\Cinema", IcsCalendarBuilder.escape("C:\\Cinema"));
    }
}
