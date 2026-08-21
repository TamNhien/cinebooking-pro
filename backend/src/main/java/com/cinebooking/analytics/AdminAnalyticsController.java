package com.cinebooking.analytics;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static com.cinebooking.analytics.AnalyticsDtos.Dashboard;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AdminAnalyticsService service;
    private final AnalyticsExportService exportService;

    public AdminAnalyticsController(AdminAnalyticsService service, AnalyticsExportService exportService) {
        this.service = service;
        this.exportService = exportService;
    }

    @GetMapping
    public Dashboard dashboard(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) UUID cinemaId
    ) {
        return service.dashboard(days, cinemaId);
    }

    @GetMapping(value = "/export.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) UUID cinemaId
    ) {
        Dashboard dashboard = service.dashboard(days, cinemaId);
        byte[] file = exportService.csv(dashboard, days, cinemaId);
        return download(file, "text/csv;charset=UTF-8", filename(days, "csv"));
    }

    @GetMapping(value = "/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportXlsx(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) UUID cinemaId
    ) {
        Dashboard dashboard = service.dashboard(days, cinemaId);
        byte[] file = exportService.xlsx(dashboard, days, cinemaId);
        return download(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename(days, "xlsx"));
    }

    private ResponseEntity<byte[]> download(byte[] content, String contentType, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build());
        headers.setContentLength(content.length);
        return ResponseEntity.ok().headers(headers).body(content);
    }

    private String filename(int requestedDays, String extension) {
        int days = Math.max(7, Math.min(requestedDays, 365));
        return "cinebooking-analytics-" + days + "d-" + LocalDate.now(BUSINESS_ZONE) + "." + extension;
    }
}
