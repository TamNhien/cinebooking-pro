package com.cinebooking.analytics;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static com.cinebooking.analytics.AnalyticsDtos.*;
import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsExportServiceTest {
    private final AnalyticsExportService service = new AnalyticsExportService();

    @Test
    void csvIsUtf8BomAndContainsVietnameseAnalyticsSections() {
        byte[] csv = service.csv(sampleDashboard(), 30, null);

        assertThat(csv).startsWith((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
        String text = new String(csv, StandardCharsets.UTF_8);
        assertThat(text)
                .contains("CineBooking Analytics V2")
                .contains("DOANH THU THEO NGÀY")
                .contains("HIỆU SUẤT THEO RẠP")
                .contains("Phim thử")
                .contains("Bắp caramel");
    }

    @Test
    void xlsxIsValidOpenXmlZipWithExpectedSheets() throws Exception {
        byte[] xlsx = service.xlsx(sampleDashboard(), 30, null);

        assertThat(xlsx).startsWith((byte) 'P', (byte) 'K');
        String workbook = null;
        boolean hasStyles = false;
        boolean hasSheet1 = false;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(xlsx), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("xl/workbook.xml".equals(entry.getName())) {
                    workbook = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                } else if ("xl/styles.xml".equals(entry.getName())) {
                    hasStyles = true;
                } else if ("xl/worksheets/sheet1.xml".equals(entry.getName())) {
                    hasSheet1 = true;
                }
            }
        }

        assertThat(hasStyles).isTrue();
        assertThat(hasSheet1).isTrue();
        assertThat(workbook)
                .contains("Tổng quan")
                .contains("Doanh thu ngày")
                .contains("Payment provider");
    }

    private Dashboard sampleDashboard() {
        return new Dashboard(
                new Kpi(new BigDecimal("1234567"), 12, 30, 24, new BigDecimal("250000"), new BigDecimal("102880.58"), 66.7, 92.5, 4.2, 19, 3),
                List.of(new DailyPoint(LocalDate.of(2026, 8, 21), new BigDecimal("1234567"), 12, 24, 19)),
                List.of(new NameValue("Phim thử", new BigDecimal("1000000"), 10)),
                List.of(new NameValue("MOCK", new BigDecimal("1234567"), 12)),
                List.of(new NameValue("Bắp caramel", new BigDecimal("250000"), 5)),
                List.of(new CinemaPerformance(UUID.randomUUID(), "Rạp Trung tâm", new BigDecimal("1234567"), 12, 24, 40, 60.0)),
                List.of(new ShowtimePerformance(UUID.randomUUID(), "Phim thử", "Rạp Trung tâm", "Phòng 1", Instant.parse("2026-08-21T12:00:00Z"), new BigDecimal("1234567"), 24, 40, 60.0)),
                List.of(new SeatHeatCell("A", 1, 4, new BigDecimal("200000"))),
                List.of(new HourlyDemand(19, 12, 24, new BigDecimal("1234567"))),
                List.of(new StaffPerformance(UUID.randomUUID(), "NV001", "Nguyễn Văn A", "Rạp Trung tâm", 19)),
                List.of(new StatusCount("CONFIRMED", 12)),
                List.of(new StatusCount("SUCCESS", 12))
        );
    }
}
