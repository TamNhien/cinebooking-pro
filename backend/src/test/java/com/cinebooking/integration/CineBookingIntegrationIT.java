package com.cinebooking.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.cinebooking.movie.ShowtimePlanningService;
import com.cinebooking.movie.AuditoriumBlackoutService;
import com.cinebooking.booking.TicketTransferService;
import com.cinebooking.booking.BookingRepository;
import com.cinebooking.operations.TicketTokenService;
import com.cinebooking.operations.CheckInService;
import com.cinebooking.user.UserRepository;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.domain.*;
import com.cinebooking.common.ApiException;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest(properties = {
        "app.jwt.secret=v28-ci-test-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "app.admin.email=",
        "app.admin.password=",
        "app.mail.enabled=false",
        "app.upload.dir=target/it-uploads",
        "app.notifications.staff-shift-scan-ms=3600000"
})
@AutoConfigureMockMvc
class CineBookingIntegrationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("cinebooking_it")
            .withUsername("cinebooking")
            .withPassword("cinebooking")
            .withStartupTimeout(Duration.ofMinutes(2));

    @Container
    @ServiceConnection(name = "redis")
    static final GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:8.8-alpine"))
            .withExposedPorts(6379)
            .withStartupTimeout(Duration.ofMinutes(2));

    @Autowired JdbcTemplate jdbc;
    @Autowired StringRedisTemplate redisTemplate;
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ShowtimePlanningService showtimePlanning;
    @Autowired AuditoriumBlackoutService blackoutService;
    @Autowired TicketTransferService ticketTransfers;
    @Autowired TicketTokenService ticketTokens;
    @Autowired CheckInService checkInService;
    @Autowired BookingRepository bookings;
    @Autowired UserRepository users;
    @Autowired ShowtimeRepository showtimes;

    @Test
    void flywayMigratesRealPostgresToV36OperationsSchemaAndDemoCatalog() {
        Integer migrationCount = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success = true", Integer.class);
        String latest = jdbc.queryForObject(
                "select version from flyway_schema_history where success = true and version is not null order by installed_rank desc limit 1",
                String.class);
        Integer publicTables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
                Integer.class);

        assertThat(migrationCount).isGreaterThanOrEqualTo(27);
        assertThat(latest).isEqualTo("36");
        assertThat(publicTables).isGreaterThanOrEqualTo(32);

        Integer waitlistTable = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'showtime_waitlist'", Integer.class);
        assertThat(waitlistTable).isEqualTo(1);
        Integer blackoutTable = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'auditorium_blackout'", Integer.class);
        assertThat(blackoutTable).isEqualTo(1);
        Integer transferColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='booking' and column_name in ('purchaser_user_id','ticket_version','transfer_count','transferred_at','transferred_from_user_id')", Integer.class);
        assertThat(transferColumns).isEqualTo(5);

        Integer activeMovies = jdbc.queryForObject(
                "select count(*) from movie where active = true", Integer.class);
        Integer september30Movies = jdbc.queryForObject(
                """
                select count(distinct movie_id)
                from showtime
                where status = 'OPEN'
                  and start_time >= timestamptz '2026-09-30 00:00:00+07'
                  and start_time < timestamptz '2026-10-01 00:00:00+07'
                """, Integer.class);
        Integer september30Showtimes = jdbc.queryForObject(
                """
                select count(*)
                from showtime
                where status = 'OPEN'
                  and start_time >= timestamptz '2026-09-30 00:00:00+07'
                  and start_time < timestamptz '2026-10-01 00:00:00+07'
                """, Integer.class);

        assertThat(activeMovies).isGreaterThanOrEqualTo(8);
        assertThat(september30Movies).isGreaterThanOrEqualTo(8);
        assertThat(september30Showtimes).isGreaterThanOrEqualTo(16);
    }

    @Test
    void secureTicketTransferMovesOwnershipAndInvalidatesOldQr() {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        AppUser sender = customer("v36-sender-" + stamp + "@example.test", "V36 Sender");
        AppUser recipient = customer("v36-recipient-" + stamp + "@example.test", "V36 Recipient");
        AppUser admin = new AppUser();
        admin.setEmail("v36-admin-" + stamp + "@example.test");
        admin.setFullName("V36 Admin");
        admin.setPasswordHash("test-only");
        admin.setRole(Role.ADMIN);
        users.save(admin);

        Showtime showtime = new Showtime();
        showtime.setMovieId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        showtime.setAuditoriumId(UUID.fromString("44444444-4444-4444-4444-444444444445"));
        showtime.setStartTime(Instant.now().plusSeconds(24 * 60 * 60));
        showtime.setBasePrice(new BigDecimal("90000"));
        showtime.setStatus(ShowtimeStatus.OPEN);
        showtimes.save(showtime);

        Booking booking = new Booking();
        booking.setUserId(sender.getId());
        booking.setPurchaserUserId(sender.getId());
        booking.setShowtimeId(showtime.getId());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setTotalAmount(new BigDecimal("90000"));
        booking.setSeatAmount(new BigDecimal("90000"));
        booking.setConcessionAmount(BigDecimal.ZERO);
        booking.setDiscountAmount(BigDecimal.ZERO);
        booking.setPointsRedeemed(0);
        booking.setConfirmedAt(Instant.now());
        booking.setTicketVersion(1);
        booking.setTransferCount(0);
        bookings.save(booking);

        String oldQr = ticketTokens.create(booking.getId(), showtime.getId(), 1);
        var eligibility = ticketTransfers.eligibility(booking.getId(), sender.getEmail());
        assertThat(eligibility.allowed()).isTrue();

        var transferred = ticketTransfers.transfer(
                booking.getId(), sender.getEmail(),
                new com.cinebooking.booking.BookingDtos.TransferTicketRequest(recipient.getEmail()),
                "127.0.0.1");
        assertThat(transferred.ticketVersion()).isEqualTo(2);

        Booking moved = bookings.findById(booking.getId()).orElseThrow();
        assertThat(moved.getUserId()).isEqualTo(recipient.getId());
        assertThat(moved.getPurchaserUserId()).isEqualTo(sender.getId());
        assertThat(moved.getTransferCount()).isEqualTo(1);
        assertThat(moved.getTicketVersion()).isEqualTo(2);

        assertThatThrownBy(() -> checkInService.preview(oldQr, admin.getEmail()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("QR vé đã hết hiệu lực");

        String newQr = ticketTokens.create(moved.getId(), moved.getShowtimeId(), moved.getTicketVersion());
        var preview = checkInService.preview(newQr, admin.getEmail());
        assertThat(preview.allowed()).isTrue();
    }

    @Test
    void showtimePlannerDetectsSeededRoomCollisionWithoutWriting() {
        var request = new com.cinebooking.movie.AdminCatalogDtos.ShowtimePlanRequest(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                UUID.fromString("44444444-4444-4444-4444-444444444445"),
                LocalDate.of(2026, 9, 30),
                LocalDate.of(2026, 9, 30),
                List.of(LocalTime.of(10, 0), LocalTime.of(22, 30)),
                new BigDecimal("90000"),
                "OPEN",
                true);
        var preview = showtimePlanning.preview(request);
        assertThat(preview.requested()).isEqualTo(2);
        assertThat(preview.creatable()).isEqualTo(1);
        assertThat(preview.conflicts()).isEqualTo(1);
        assertThat(preview.slots().stream().filter(s -> !s.creatable()).findFirst().orElseThrow().conflictLabel())
                .contains("Hành Trình Sao Hỏa");
    }


    @Test
    void showtimePlannerTreatsAuditoriumBlackoutAsConflict() {
        UUID auditoriumId = UUID.fromString("44444444-4444-4444-4444-444444444445");
        var created = blackoutService.create(new com.cinebooking.movie.AdminCatalogDtos.AuditoriumBlackoutRequest(
                auditoriumId,
                Instant.parse("2026-10-01T03:00:00Z"),
                Instant.parse("2026-10-01T06:00:00Z"),
                "V34 integration maintenance"));
        try {
            var request = new com.cinebooking.movie.AdminCatalogDtos.ShowtimePlanRequest(
                    UUID.fromString("11111111-1111-1111-1111-111111111111"),
                    auditoriumId,
                    LocalDate.of(2026, 10, 1),
                    LocalDate.of(2026, 10, 1),
                    List.of(LocalTime.of(10, 30)),
                    new BigDecimal("90000"),
                    "OPEN",
                    true);
            var preview = showtimePlanning.preview(request);
            assertThat(preview.requested()).isEqualTo(1);
            assertThat(preview.creatable()).isZero();
            assertThat(preview.conflicts()).isEqualTo(1);
            assertThat(preview.slots().getFirst().conflictType()).isEqualTo("BLACKOUT");
            assertThat(preview.slots().getFirst().conflictBlackoutId()).isEqualTo(created.id());
            assertThat(preview.slots().getFirst().conflictLabel()).contains("V34 integration maintenance");
        } finally {
            blackoutService.delete(created.id());
        }
    }

    @Test
    void redisConnectionUsesRealContainer() {
        String key = "v28:ci:" + UUID.randomUUID();
        redisTemplate.opsForValue().set(key, "ok", Duration.ofSeconds(30));
        assertThat(redisTemplate.opsForValue().get(key)).isEqualTo("ok");
        redisTemplate.delete(key);
    }

    @Test
    void registerLoginJwtAndProtectedProfileWorkTogether() throws Exception {
        String email = "v28-" + UUID.randomUUID() + "@example.com";
        String password = "V28@Test12345";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s","fullName":"V28 Integration User"}
                                """.formatted(email, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"));

        String loginBody = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(loginBody);
        String token = json.path("accessToken").asText();
        assertThat(token.split("\\.")).hasSize(3);

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.accountEnabled").value(true));
    }

    private AppUser customer(String email, String name) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setFullName(name);
        user.setPasswordHash("test-only");
        user.setRole(Role.USER);
        return users.save(user);
    }
}
