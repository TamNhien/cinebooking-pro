package com.cinebooking.analytics;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
                .contains("TRẠNG THÁI BOOKING")
                .contains("PHƯƠNG THỨC THANH TOÁN")
                .contains("Phim thử")
                .contains("Bắp caramel");
    }

    @Test
    void csvZipCreatesOneUtf8CsvPerAnalyticsTable() throws Exception {
        byte[] csvZip = service.csvZip(sampleDashboard(), 30, null);

        assertThat(csvZip).startsWith((byte) 'P', (byte) 'K');
        Map<String, byte[]> entries = unzipBinaryEntries(csvZip);

        assertThat(entries).hasSize(12);
        assertThat(entries.keySet()).containsExactlyInAnyOrder(
                "01-tong-quan.csv",
                "02-doanh-thu-theo-ngay.csv",
                "03-hieu-suat-theo-rap.csv",
                "04-top-phim.csv",
                "05-top-suat-chieu.csv",
                "06-nhu-cau-theo-gio.csv",
                "07-heatmap-ghe.csv",
                "08-hieu-suat-nhan-vien.csv",
                "09-trang-thai-booking.csv",
                "10-trang-thai-payment.csv",
                "11-top-bap-nuoc.csv",
                "12-phuong-thuc-thanh-toan.csv"
        );

        for (byte[] csv : entries.values()) {
            assertThat(csv).startsWith((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
            String text = new String(csv, StandardCharsets.UTF_8);
            assertThat(text)
                    .contains("\"Khoảng dữ liệu\",\"30 ngày\"")
                    .contains("\"Rạp\",\"Tất cả rạp\"")
                    .contains("Ngày xuất");
        }

        assertThat(new String(entries.get("02-doanh-thu-theo-ngay.csv"), StandardCharsets.UTF_8))
                .contains("CineBooking Analytics V2 - DOANH THU THEO NGÀY")
                .contains("\"Ngày\",\"Doanh thu\",\"Booking\",\"Vé\",\"Check-in\"")
                .contains("\"2026-08-21\",\"1234567\",\"12\",\"24\",\"19\"");

        assertThat(new String(entries.get("12-phuong-thuc-thanh-toan.csv"), StandardCharsets.UTF_8))
                .contains("CineBooking Analytics V2 - PHƯƠNG THỨC THANH TOÁN")
                .contains("\"Provider\",\"Doanh thu\",\"Giao dịch\"")
                .contains("\"MOCK\",\"1234567\",\"12\"");
    }

    @Test
    void xlsxCreatesOneDetailedWorksheetPerCsvTable() throws Exception {
        byte[] xlsx = service.xlsx(sampleDashboard(), 30, null);

        assertThat(xlsx).startsWith((byte) 'P', (byte) 'K');
        Map<String, String> entries = unzipTextEntries(xlsx);
        String workbook = entries.get("xl/workbook.xml");

        assertThat(entries).containsKey("xl/styles.xml");
        assertThat(workbook)
                .contains("Tổng quan")
                .contains("Doanh thu theo ngày")
                .contains("Hiệu suất theo rạp")
                .contains("Top phim")
                .contains("Top suất chiếu")
                .contains("Nhu cầu theo giờ")
                .contains("Heatmap ghế")
                .contains("Hiệu suất nhân viên")
                .contains("Trạng thái booking")
                .contains("Trạng thái payment")
                .contains("Top bắp nước")
                .contains("Phương thức thanh toán");

        assertThat(workbook.split("<sheet ", -1).length - 1).isEqualTo(12);
    }

    @Test
    void xlsxRepeatsFiltersAndUsesDetailedTableHeaderOnEveryWorksheet() throws Exception {
        byte[] xlsx = service.xlsx(sampleDashboard(), 30, null);
        Map<String, String> entries = unzipTextEntries(xlsx);

        String daily = entries.get("xl/worksheets/sheet2.xml");
        assertThat(daily)
                .contains("CineBooking Analytics V2 - DOANH THU THEO NGÀY")
                .contains("Khoảng dữ liệu")
                .contains("30 ngày")
                .contains("Rạp")
                .contains("Tất cả rạp")
                .contains("Ngày xuất")
                .contains("Ngày")
                .contains("Doanh thu")
                .contains("Booking")
                .contains("Check-in")
                .contains("2026-08-21")
                .contains("<pane ySplit=\"6\" topLeftCell=\"A7\"")
                .contains("<autoFilter ref=\"A6:E7\"/>");

        String showtimes = entries.get("xl/worksheets/sheet5.xml");
        assertThat(showtimes)
                .contains("TOP SUẤT CHIẾU")
                .contains("Phim thử")
                .contains("Rạp Trung tâm")
                .contains("Phòng 1")
                .contains("<autoFilter ref=\"A6:H7\"/>");

        String providers = entries.get("xl/worksheets/sheet12.xml");
        assertThat(providers)
                .contains("PHƯƠNG THỨC THANH TOÁN")
                .contains("MOCK")
                .contains("Giao dịch")
                .contains("<autoFilter ref=\"A6:C7\"/>");
    }

    private Map<String, byte[]> unzipBinaryEntries(byte[] zipBytes) throws Exception {
        Map<String, byte[]> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(zipBytes), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), zip.readAllBytes());
            }
        }
        return entries;
    }

    private Map<String, String> unzipTextEntries(byte[] xlsx) throws Exception {
        Map<String, String> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(xlsx), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
            }
        }
        return entries;
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
