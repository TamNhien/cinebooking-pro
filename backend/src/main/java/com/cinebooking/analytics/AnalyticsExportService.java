package com.cinebooking.analytics;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static com.cinebooking.analytics.AnalyticsDtos.*;

@Service
public class AnalyticsExportService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(BUSINESS_ZONE);

    public byte[] csv(Dashboard dashboard, int requestedDays, UUID cinemaId) {
        int days = normalizeDays(requestedDays);
        StringBuilder out = new StringBuilder();
        out.append('\uFEFF');
        csvRow(out, "CineBooking Analytics V2");
        csvRow(out, "Khoảng dữ liệu", days + " ngày");
        csvRow(out, "Rạp", cinemaLabel(dashboard, cinemaId));
        blank(out);

        csvSection(out, "TỔNG QUAN", new String[]{"Chỉ số", "Giá trị"}, List.of(
                new Object[]{"Doanh thu", dashboard.kpi().revenue()},
                new Object[]{"Booking xác nhận", dashboard.kpi().confirmedBookings()},
                new Object[]{"Vé đã bán", dashboard.kpi().tickets()},
                new Object[]{"Doanh thu bắp nước", dashboard.kpi().concessionRevenue()},
                new Object[]{"Giá trị đơn trung bình", dashboard.kpi().averageOrderValue()},
                new Object[]{"Tỷ lệ lấp đầy (%)", dashboard.kpi().occupancyRate()},
                new Object[]{"Thanh toán thành công (%)", dashboard.kpi().paymentSuccessRate()},
                new Object[]{"Tỷ lệ hoàn vé (%)", dashboard.kpi().refundRate()},
                new Object[]{"Check-in", dashboard.kpi().checkIns()},
                new Object[]{"Người dùng", dashboard.kpi().users()},
                new Object[]{"Người dùng mới", dashboard.kpi().newUsers()}
        ));

        csvSection(out, "DOANH THU THEO NGÀY", new String[]{"Ngày", "Doanh thu", "Booking", "Vé", "Check-in"},
                dashboard.dailyRevenue().stream().map(x -> new Object[]{x.day(), x.revenue(), x.bookings(), x.tickets(), x.checkIns()}).toList());

        csvSection(out, "HIỆU SUẤT THEO RẠP", new String[]{"Rạp", "Doanh thu", "Booking", "Vé", "Sức chứa", "Lấp đầy (%)"},
                dashboard.cinemaPerformance().stream().map(x -> new Object[]{x.cinemaName(), x.revenue(), x.bookings(), x.tickets(), x.capacity(), x.occupancyRate()}).toList());

        csvSection(out, "TOP PHIM", new String[]{"Phim", "Doanh thu", "Booking"},
                dashboard.topMovies().stream().map(x -> new Object[]{x.name(), x.value(), x.count()}).toList());

        csvSection(out, "TOP SUẤT CHIẾU", new String[]{"Phim", "Rạp", "Phòng", "Bắt đầu", "Doanh thu", "Vé", "Sức chứa", "Lấp đầy (%)"},
                dashboard.topShowtimes().stream().map(x -> new Object[]{x.movieTitle(), x.cinemaName(), x.auditoriumName(), formatInstant(x.startTime()), x.revenue(), x.tickets(), x.capacity(), x.occupancyRate()}).toList());

        csvSection(out, "NHU CẦU THEO GIỜ", new String[]{"Giờ", "Booking", "Vé", "Doanh thu"},
                dashboard.hourlyDemand().stream().map(x -> new Object[]{String.format("%02d:00", x.hour()), x.bookings(), x.tickets(), x.revenue()}).toList());

        csvSection(out, "HEATMAP GHẾ", new String[]{"Hàng", "Ghế", "Lượt chọn", "Doanh thu"},
                dashboard.seatHeatmap().stream().map(x -> new Object[]{x.rowLabel(), x.seatNumber(), x.bookings(), x.revenue()}).toList());

        csvSection(out, "HIỆU SUẤT NHÂN VIÊN", new String[]{"Mã NV", "Họ tên", "Rạp", "Vé check-in"},
                dashboard.staffPerformance().stream().map(x -> new Object[]{x.employeeCode(), x.fullName(), x.cinemaName(), x.checkedTickets()}).toList());

        csvSection(out, "TRẠNG THÁI BOOKING", new String[]{"Trạng thái", "Số lượng"},
                dashboard.bookingStatuses().stream().map(x -> new Object[]{x.status(), x.count()}).toList());

        csvSection(out, "TRẠNG THÁI PAYMENT", new String[]{"Trạng thái", "Số lượng"},
                dashboard.paymentStatuses().stream().map(x -> new Object[]{x.status(), x.count()}).toList());

        csvSection(out, "TOP BẮP NƯỚC", new String[]{"Sản phẩm", "Doanh thu", "Số lượng"},
                dashboard.topConcessions().stream().map(x -> new Object[]{x.name(), x.value(), x.count()}).toList());

        csvSection(out, "PHƯƠNG THỨC THANH TOÁN", new String[]{"Provider", "Doanh thu", "Giao dịch"},
                dashboard.paymentProviders().stream().map(x -> new Object[]{x.name(), x.value(), x.count()}).toList());

        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] xlsx(Dashboard dashboard, int requestedDays, UUID cinemaId) {
        int days = normalizeDays(requestedDays);
        List<Sheet> sheets = new ArrayList<>();

        sheets.add(new Sheet("Tổng quan", List.of(
                row("CineBooking Analytics V2", ""),
                row("Khoảng dữ liệu", days + " ngày"),
                row("Rạp", cinemaLabel(dashboard, cinemaId)),
                row("", ""),
                header("Chỉ số", "Giá trị"),
                row("Doanh thu", money(dashboard.kpi().revenue())),
                row("Booking xác nhận", count(dashboard.kpi().confirmedBookings())),
                row("Vé đã bán", count(dashboard.kpi().tickets())),
                row("Doanh thu bắp nước", money(dashboard.kpi().concessionRevenue())),
                row("Giá trị đơn trung bình", money(dashboard.kpi().averageOrderValue())),
                row("Tỷ lệ lấp đầy", percent(dashboard.kpi().occupancyRate())),
                row("Thanh toán thành công", percent(dashboard.kpi().paymentSuccessRate())),
                row("Tỷ lệ hoàn vé", percent(dashboard.kpi().refundRate())),
                row("Check-in", count(dashboard.kpi().checkIns())),
                row("Người dùng", count(dashboard.kpi().users())),
                row("Người dùng mới", count(dashboard.kpi().newUsers()))
        )));

        sheets.add(sheet("Doanh thu ngày", header("Ngày", "Doanh thu", "Booking", "Vé", "Check-in"),
                dashboard.dailyRevenue().stream().map(x -> row(x.day().toString(), money(x.revenue()), count(x.bookings()), count(x.tickets()), count(x.checkIns()))).toList()));

        sheets.add(sheet("Hiệu suất rạp", header("Rạp", "Doanh thu", "Booking", "Vé", "Sức chứa", "Lấp đầy"),
                dashboard.cinemaPerformance().stream().map(x -> row(x.cinemaName(), money(x.revenue()), count(x.bookings()), count(x.tickets()), count(x.capacity()), percent(x.occupancyRate()))).toList()));

        sheets.add(sheet("Top phim", header("Phim", "Doanh thu", "Booking"),
                dashboard.topMovies().stream().map(x -> row(x.name(), money(x.value()), count(x.count()))).toList()));

        sheets.add(sheet("Top suất chiếu", header("Phim", "Rạp", "Phòng", "Bắt đầu", "Doanh thu", "Vé", "Sức chứa", "Lấp đầy"),
                dashboard.topShowtimes().stream().map(x -> row(x.movieTitle(), x.cinemaName(), x.auditoriumName(), formatInstant(x.startTime()), money(x.revenue()), count(x.tickets()), count(x.capacity()), percent(x.occupancyRate()))).toList()));

        sheets.add(sheet("Khung giờ", header("Giờ", "Booking", "Vé", "Doanh thu"),
                dashboard.hourlyDemand().stream().map(x -> row(String.format("%02d:00", x.hour()), count(x.bookings()), count(x.tickets()), money(x.revenue()))).toList()));

        sheets.add(sheet("Heatmap ghế", header("Hàng", "Ghế", "Lượt chọn", "Doanh thu"),
                dashboard.seatHeatmap().stream().map(x -> row(x.rowLabel(), count(x.seatNumber()), count(x.bookings()), money(x.revenue()))).toList()));

        sheets.add(sheet("Nhân viên", header("Mã NV", "Họ tên", "Rạp", "Vé check-in"),
                dashboard.staffPerformance().stream().map(x -> row(x.employeeCode(), x.fullName(), x.cinemaName(), count(x.checkedTickets()))).toList()));

        sheets.add(sheet("Booking", header("Trạng thái", "Số lượng"),
                dashboard.bookingStatuses().stream().map(x -> row(x.status(), count(x.count()))).toList()));

        sheets.add(sheet("Payment", header("Trạng thái", "Số lượng"),
                dashboard.paymentStatuses().stream().map(x -> row(x.status(), count(x.count()))).toList()));

        sheets.add(sheet("Bắp nước", header("Sản phẩm", "Doanh thu", "Số lượng"),
                dashboard.topConcessions().stream().map(x -> row(x.name(), money(x.value()), count(x.count()))).toList()));

        sheets.add(sheet("Payment provider", header("Provider", "Doanh thu", "Giao dịch"),
                dashboard.paymentProviders().stream().map(x -> row(x.name(), money(x.value()), count(x.count()))).toList()));

        return writeWorkbook(sheets);
    }

    private Sheet sheet(String name, List<Cell> header, List<List<Cell>> body) {
        List<List<Cell>> rows = new ArrayList<>();
        rows.add(header);
        rows.addAll(body);
        return new Sheet(name, rows);
    }

    private byte[] writeWorkbook(List<Sheet> sheets) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {

            entry(zip, "[Content_Types].xml", contentTypes(sheets.size()));
            entry(zip, "_rels/.rels", rootRels());
            entry(zip, "xl/workbook.xml", workbookXml(sheets));
            entry(zip, "xl/_rels/workbook.xml.rels", workbookRels(sheets.size()));
            entry(zip, "xl/styles.xml", stylesXml());
            for (int i = 0; i < sheets.size(); i++) {
                entry(zip, "xl/worksheets/sheet" + (i + 1) + ".xml", sheetXml(sheets.get(i)));
            }
            zip.finish();
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo file Excel Analytics.", e);
        }
    }

    private String contentTypes(int sheetCount) {
        StringBuilder overrides = new StringBuilder();
        for (int i = 1; i <= sheetCount; i++) {
            overrides.append("<Override PartName=\"/xl/worksheets/sheet").append(i)
                    .append(".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>");
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
                overrides + "</Types>";
    }

    private String rootRels() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>" +
                "</Relationships>";
    }

    private String workbookXml(List<Sheet> sheets) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        xml.append("<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>");
        for (int i = 0; i < sheets.size(); i++) {
            xml.append("<sheet name=\"").append(xml(sheets.get(i).name())).append("\" sheetId=\"").append(i + 1).append("\" r:id=\"rId").append(i + 1).append("\"/>");
        }
        return xml.append("</sheets></workbook>").toString();
    }

    private String workbookRels(int sheetCount) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        xml.append("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">");
        for (int i = 1; i <= sheetCount; i++) {
            xml.append("<Relationship Id=\"rId").append(i).append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet").append(i).append(".xml\"/>");
        }
        xml.append("<Relationship Id=\"rId").append(sheetCount + 1).append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>");
        return xml.append("</Relationships>").toString();
    }

    private String stylesXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
                "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/></font></fonts>" +
                "<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF1E293B\"/><bgColor indexed=\"64\"/></patternFill></fill></fills>" +
                "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
                "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
                "<cellXfs count=\"4\">" +
                "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
                "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\"/>" +
                "<xf numFmtId=\"3\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"10\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";
    }

    private String sheetXml(Sheet sheet) {
        int columns = Math.max(1, sheet.rows().stream().mapToInt(List::size).max().orElse(1));
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        xml.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">")
                .append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>")
                .append("<cols>");
        for (int c = 1; c <= columns; c++) {
            double width = c == 1 ? 30 : 20;
            xml.append("<col min=\"").append(c).append("\" max=\"").append(c).append("\" width=\"").append(width).append("\" customWidth=\"1\"/>");
        }
        xml.append("</cols><sheetData>");
        for (int r = 0; r < sheet.rows().size(); r++) {
            int rowNumber = r + 1;
            xml.append("<row r=\"").append(rowNumber).append("\">");
            List<Cell> row = sheet.rows().get(r);
            for (int c = 0; c < row.size(); c++) {
                xml.append(cellXml(row.get(c), columnName(c + 1) + rowNumber));
            }
            xml.append("</row>");
        }
        return xml.append("</sheetData><autoFilter ref=\"A1:").append(columnName(columns)).append("1\"/></worksheet>").toString();
    }

    private String cellXml(Cell cell, String ref) {
        Object value = cell.value();
        if (value == null) return "<c r=\"" + ref + "\"/>";
        int style = cell.style();
        String styleAttr = style == 0 ? "" : " s=\"" + style + "\"";
        if (value instanceof Number number) {
            return "<c r=\"" + ref + "\"" + styleAttr + "><v>" + number + "</v></c>";
        }
        return "<c r=\"" + ref + "\" t=\"inlineStr\"" + styleAttr + "><is><t xml:space=\"preserve\">" + xml(String.valueOf(value)) + "</t></is></c>";
    }

    private void entry(ZipOutputStream zip, String name, String text) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(text.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private void csvSection(StringBuilder out, String title, String[] headers, List<Object[]> rows) {
        csvRow(out, title);
        csvRow(out, (Object[]) headers);
        for (Object[] row : rows) csvRow(out, row);
        blank(out);
    }

    private void csvRow(StringBuilder out, Object... values) {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) out.append(',');
            String value = values[i] == null ? "" : String.valueOf(values[i]);
            out.append('"').append(value.replace("\"", "\"\"")).append('"');
        }
        out.append("\r\n");
    }

    private void blank(StringBuilder out) {
        out.append("\r\n");
    }

    private int normalizeDays(int requestedDays) {
        return Math.max(7, Math.min(requestedDays, 365));
    }

    private String cinemaLabel(Dashboard dashboard, UUID cinemaId) {
        if (cinemaId == null) return "Tất cả rạp";
        return dashboard.cinemaPerformance().stream()
                .filter(x -> cinemaId.equals(x.cinemaId()))
                .map(CinemaPerformance::cinemaName)
                .findFirst()
                .orElse(cinemaId.toString());
    }

    private String formatInstant(Instant instant) {
        return instant == null ? "" : DATE_TIME.format(instant);
    }

    private String xml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String columnName(int column) {
        StringBuilder name = new StringBuilder();
        int current = column;
        while (current > 0) {
            int rem = (current - 1) % 26;
            name.insert(0, (char) ('A' + rem));
            current = (current - 1) / 26;
        }
        return name.toString();
    }

    private List<Cell> header(String... values) {
        List<Cell> cells = new ArrayList<>();
        for (String value : values) cells.add(new Cell(value, 1));
        return cells;
    }

    private List<Cell> row(Object... values) {
        List<Cell> cells = new ArrayList<>();
        for (Object value : values) {
            cells.add(value instanceof StyledValue styled ? new Cell(styled.value(), styled.style()) : new Cell(value, 0));
        }
        return cells;
    }

    private StyledValue money(BigDecimal value) {
        return new StyledValue(value == null ? BigDecimal.ZERO : value, 2);
    }

    private StyledValue count(long value) {
        return new StyledValue(value, 2);
    }

    private StyledValue percent(double value) {
        return new StyledValue(value / 100.0, 3);
    }

    private record StyledValue(Object value, int style) {}
    private record Cell(Object value, int style) {}
    private record Sheet(String name, List<List<Cell>> rows) {}
}
