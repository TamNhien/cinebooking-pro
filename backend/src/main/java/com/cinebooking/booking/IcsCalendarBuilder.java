package com.cinebooking.booking;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public final class IcsCalendarBuilder {
    private static final DateTimeFormatter ICS_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
            .withZone(ZoneOffset.UTC);

    private IcsCalendarBuilder() {}

    public static String build(UUID bookingId, String movieTitle, Instant start, Instant end,
                               String location, String description, Instant generatedAt) {
        return String.join("\r\n",
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//CineBooking Pro//Ticket Calendar//VI",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "BEGIN:VEVENT",
                "UID:" + bookingId + "@cinebooking.local",
                "DTSTAMP:" + ICS_TIME.format(generatedAt),
                "DTSTART:" + ICS_TIME.format(start),
                "DTEND:" + ICS_TIME.format(end),
                "SUMMARY:" + escape("CineBooking - " + movieTitle),
                "LOCATION:" + escape(location),
                "DESCRIPTION:" + escape(description),
                "STATUS:CONFIRMED",
                "END:VEVENT",
                "END:VCALENDAR",
                "");
    }

    public static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace(";", "\\;")
                .replace(",", "\\,");
    }
}
