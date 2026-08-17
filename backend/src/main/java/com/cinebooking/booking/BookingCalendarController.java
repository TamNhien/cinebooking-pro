package com.cinebooking.booking;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingCalendarController {
    private static final MediaType TEXT_CALENDAR = MediaType.parseMediaType("text/calendar;charset=UTF-8");
    private final BookingCalendarService calendars;

    public BookingCalendarController(BookingCalendarService calendars) {
        this.calendars = calendars;
    }

    @GetMapping(value = "/{id}/calendar.ics", produces = "text/calendar;charset=UTF-8")
    public ResponseEntity<byte[]> calendar(@PathVariable UUID id, Authentication auth) {
        var file = calendars.create(id, auth.getName());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(TEXT_CALENDAR);
        headers.setContentDisposition(ContentDisposition.attachment().filename(file.filename(), StandardCharsets.UTF_8).build());
        headers.setCacheControl("no-store");
        return ResponseEntity.ok().headers(headers).body(file.content().getBytes(StandardCharsets.UTF_8));
    }
}
