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
import com.cinebooking.payment.PaymentAttemptService;
import com.cinebooking.payment.PaymentRepository;
import com.cinebooking.commerce.LoyaltyService;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.finance.FinancialLedgerService;
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
import java.time.ZoneId;
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
        "app.notifications.staff-shift-scan-ms=3600000",
        "app.finance.auto-reconcile-enabled=false"
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
    @Autowired PaymentAttemptService paymentAttempts;
    @Autowired PaymentRepository payments;
    @Autowired LoyaltyService loyalty;
    @Autowired NotificationService notifications;
    @Autowired FinancialLedgerService finance;

    @Test
    void flywayMigratesRealPostgresToV48MultiCinemaInventorySchemaAndCatalog() {
        Integer migrationCount = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success = true", Integer.class);
        String latest = jdbc.queryForObject(
                "select version from flyway_schema_history where success = true and version is not null order by installed_rank desc limit 1",
                String.class);
        Integer publicTables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
                Integer.class);

        assertThat(migrationCount).isGreaterThanOrEqualTo(30);
        assertThat(latest).isEqualTo("48");
        assertThat(publicTables).isGreaterThanOrEqualTo(52);

        Integer waitlistTable = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'showtime_waitlist'", Integer.class);
        assertThat(waitlistTable).isEqualTo(1);
        Integer blackoutTable = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'auditorium_blackout'", Integer.class);
        assertThat(blackoutTable).isEqualTo(1);
        Integer transferColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='booking' and column_name in ('purchaser_user_id','ticket_version','transfer_count','transferred_at','transferred_from_user_id')", Integer.class);
        assertThat(transferColumns).isEqualTo(5);
        Integer paymentV37Columns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='payment' and column_name in ('payer_user_id','client_idempotency_key','provider_order_id','merchant_request_id','provider_created_at','provider_response_code','provider_message','expires_at','failed_at','updated_at','last_webhook_at')", Integer.class);
        assertThat(paymentV37Columns).isEqualTo(11);
        Integer webhookTable = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name='payment_webhook_event'", Integer.class);
        assertThat(webhookTable).isEqualTo(1);
        Integer refundV38BookingColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='booking' and column_name in ('refund_rate_percent','refund_fee_amount','refund_policy_code','refund_automatic','refund_processed_at','refund_processed_by','refund_provider_reference')", Integer.class);
        assertThat(refundV38BookingColumns).isEqualTo(7);
        Integer refundV38PaymentColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='payment' and column_name in ('refunded_amount','refunded_at','refund_reference')", Integer.class);
        assertThat(refundV38PaymentColumns).isEqualTo(3);

        Integer loyaltyV40UserColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='app_user' and column_name in ('loyalty_lifetime_points','birth_date','birthday_reward_year')", Integer.class);
        assertThat(loyaltyV40UserColumns).isEqualTo(3);
        Integer loyaltyV40Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('loyalty_point_lot','loyalty_reward','loyalty_reward_redemption')", Integer.class);
        assertThat(loyaltyV40Tables).isEqualTo(3);
        Integer notificationV41Columns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='user_notification' and column_name in ('priority','read_at','archived_at')", Integer.class);
        assertThat(notificationV41Columns).isEqualTo(3);
        Integer notificationV41PreferenceColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='notification_preference' and column_name in ('loyalty_enabled','waitlist_enabled')", Integer.class);
        assertThat(notificationV41PreferenceColumns).isEqualTo(2);
        Integer financialV42Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('financial_ledger_entry','financial_ledger_line','financial_reconciliation_run','financial_reconciliation_issue')", Integer.class);
        assertThat(financialV42Tables).isEqualTo(4);
        Integer financialV42Triggers = jdbc.queryForObject(
                "select count(*) from pg_trigger where not tgisinternal and tgname in ('trg_v42_financial_ledger_entry_immutable','trg_v42_financial_ledger_line_immutable','trg_v42_financial_ledger_balanced')", Integer.class);
        assertThat(financialV42Triggers).isEqualTo(3);
        Integer staffV43Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('staff_shift_handover','staff_incident')", Integer.class);
        assertThat(staffV43Tables).isEqualTo(2);
        Integer staffV43Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('uq_staff_handover_pending_attendance','idx_staff_incident_cinema_status_created')", Integer.class);
        assertThat(staffV43Indexes).isEqualTo(2);
        Integer maintenanceV44Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('cinema_equipment_asset','maintenance_work_order','maintenance_work_order_event')", Integer.class);
        assertThat(maintenanceV44Tables).isEqualTo(3);
        Integer maintenanceV44Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_equipment_cinema_status','idx_maintenance_work_order_cinema_status_created','idx_maintenance_event_order_created')", Integer.class);
        assertThat(maintenanceV44Indexes).isEqualTo(3);
        Integer maintenanceV44Trigger = jdbc.queryForObject(
                "select count(*) from pg_trigger where not tgisinternal and tgname='trg_v44_maintenance_event_immutable'", Integer.class);
        assertThat(maintenanceV44Trigger).isEqualTo(1);
        Integer supportV45Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('customer_support_case','customer_support_case_event')", Integer.class);
        assertThat(supportV45Tables).isEqualTo(2);
        Integer supportV45Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_support_case_user_created','idx_support_case_cinema_status_created','idx_support_event_case_created')", Integer.class);
        assertThat(supportV45Indexes).isEqualTo(3);
        Integer supportV45Trigger = jdbc.queryForObject(
                "select count(*) from pg_trigger where not tgisinternal and tgname='trg_v45_support_event_immutable'", Integer.class);
        assertThat(supportV45Trigger).isEqualTo(1);
        Integer securityV46Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('trusted_device','security_alert')", Integer.class);
        assertThat(securityV46Tables).isEqualTo(2);
        Integer securityV46Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_trusted_device_user_active','idx_security_alert_user_created','idx_security_alert_unacknowledged')", Integer.class);
        assertThat(securityV46Indexes).isEqualTo(3);
        Integer paymentV47Table = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name='payment_event'", Integer.class);
        assertThat(paymentV47Table).isEqualTo(1);
        Integer paymentV47Columns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='payment' and column_name in ('attempt_no','retry_of_payment_id','cancelled_at','last_reconciled_at','next_reconcile_at','reconciliation_failures','last_reconcile_message')", Integer.class);
        assertThat(paymentV47Columns).isEqualTo(7);
        Integer paymentV47Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('uq_payment_booking_attempt_no','idx_payment_retry_parent','idx_payment_reconcile_due','idx_payment_event_payment_created','idx_payment_event_type_created')", Integer.class);
        assertThat(paymentV47Indexes).isEqualTo(5);
        Integer inventoryV48Tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and table_name in ('cinema_concession_inventory','cinema_concession_price')", Integer.class);
        assertThat(inventoryV48Tables).isEqualTo(2);
        Integer inventoryV48MovementColumns = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='inventory_movement' and column_name in ('cinema_id','reference_key')", Integer.class);
        assertThat(inventoryV48MovementColumns).isEqualTo(2);
        Integer inventoryV48Indexes = jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_branch_concession_inventory_alert','idx_branch_concession_price_lookup','idx_inventory_movement_cinema_created','idx_inventory_movement_reference')", Integer.class);
        assertThat(inventoryV48Indexes).isEqualTo(4);
        Integer voucherOwnerColumn = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_schema='public' and table_name='voucher' and column_name='owner_user_id'", Integer.class);
        assertThat(voucherOwnerColumn).isEqualTo(1);
        Integer rewardSeeds = jdbc.queryForObject("select count(*) from loyalty_reward where active=true", Integer.class);
        assertThat(rewardSeeds).isGreaterThanOrEqualTo(3);

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
    void financialV42LedgerIsIdempotentBalancedAndReconcilesCleanly() {
        String stamp = UUID.randomUUID().toString().substring(0,8);
        AppUser payer = customer("v42-finance-" + stamp + "@example.test", "V42 Finance");
        Showtime showtime = showtimes.findAll().stream().filter(st -> st.getStartTime().isAfter(Instant.now())).findFirst().orElseThrow();
        Booking booking = new Booking();
        booking.setUserId(payer.getId()); booking.setPurchaserUserId(payer.getId()); booking.setShowtimeId(showtime.getId());
        booking.setStatus(BookingStatus.CONFIRMED); booking.setTotalAmount(new BigDecimal("120000")); booking.setSeatAmount(new BigDecimal("120000"));
        booking.setConcessionAmount(BigDecimal.ZERO); booking.setDiscountAmount(BigDecimal.ZERO); booking.setPointsRedeemed(0); booking.setConfirmedAt(Instant.now());
        bookings.save(booking);

        Payment payment = new Payment(); payment.setBookingId(booking.getId()); payment.setPayerUserId(payer.getId()); payment.setProvider("MOCK");
        payment.setStatus(PaymentStatus.SUCCESS); payment.setAmount(new BigDecimal("120000")); payment.setPaidAt(Instant.now());
        payments.save(payment);

        finance.recordPaymentCapture(payment,booking);
        finance.recordPaymentCapture(payment,booking);
        Integer entryCount = jdbc.queryForObject("select count(*) from financial_ledger_entry where event_key=?",Integer.class,"PAYMENT_CAPTURE:"+payment.getId());
        Integer lineCount = jdbc.queryForObject("select count(*) from financial_ledger_line l join financial_ledger_entry e on e.id=l.entry_id where e.event_key=?",Integer.class,"PAYMENT_CAPTURE:"+payment.getId());
        BigDecimal debit = jdbc.queryForObject("select coalesce(sum(l.amount),0) from financial_ledger_line l join financial_ledger_entry e on e.id=l.entry_id where e.event_key=? and l.direction='DEBIT'",BigDecimal.class,"PAYMENT_CAPTURE:"+payment.getId());
        BigDecimal credit = jdbc.queryForObject("select coalesce(sum(l.amount),0) from financial_ledger_line l join financial_ledger_entry e on e.id=l.entry_id where e.event_key=? and l.direction='CREDIT'",BigDecimal.class,"PAYMENT_CAPTURE:"+payment.getId());
        assertThat(entryCount).isEqualTo(1); assertThat(lineCount).isEqualTo(2); assertThat(debit).isEqualByComparingTo("120000.00"); assertThat(credit).isEqualByComparingTo(debit);

        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var run=finance.reconcile(day,"v42-admin@example.test","127.0.0.1");
        assertThat(run.status()).isEqualTo("CLEAN");
        assertThat(run.issueCount()).isZero();
        assertThat(run.paymentAmount()).isEqualByComparingTo(run.ledgerCaptureAmount());

        LocalDate previous=day.minusDays(1);
        var autoFirst=finance.reconcileScheduled(previous);
        var autoReplay=finance.reconcileScheduled(previous);
        assertThat(autoReplay.id()).isEqualTo(autoFirst.id());
        assertThat(autoReplay.runKey()).isEqualTo("AUTO:"+previous);
    }

    @Test
    void notificationV41ArchiveAndPrioritySummaryStayConsistent() {
        String stamp = Long.toString(System.nanoTime());
        AppUser customer = customer("v41-notify-" + stamp + "@example.test", "V41 Notify");
        boolean first = notifications.createOnce(customer.getId(),"WAITLIST_AVAILABLE","Ghế vừa trống","Có ghế vừa được mở lại.","/waitlist","V41-WAITLIST:"+customer.getId());
        boolean duplicate = notifications.createOnce(customer.getId(),"WAITLIST_AVAILABLE","Ghế vừa trống","Có ghế vừa được mở lại.","/waitlist","V41-WAITLIST:"+customer.getId());
        assertThat(first).isTrue(); assertThat(duplicate).isFalse();

        var active = notifications.list(customer.getEmail(),"ACTIVE");
        assertThat(active).hasSize(1);
        assertThat(active.getFirst().category()).isEqualTo("WAITLIST");
        assertThat(active.getFirst().priority()).isEqualTo("HIGH");
        var before = notifications.summary(customer.getEmail());
        assertThat(before.unreadCount()).isEqualTo(1);
        assertThat(before.highPriorityUnreadCount()).isEqualTo(1);

        notifications.archive(active.getFirst().id(),customer.getEmail());
        assertThat(notifications.list(customer.getEmail(),"ACTIVE")).isEmpty();
        assertThat(notifications.list(customer.getEmail(),"ARCHIVED")).hasSize(1);
        var archived = notifications.summary(customer.getEmail());
        assertThat(archived.unreadCount()).isZero();
        assertThat(archived.archivedCount()).isEqualTo(1);

        notifications.unarchive(active.getFirst().id(),customer.getEmail());
        notifications.read(active.getFirst().id(),customer.getEmail());
        var after = notifications.summary(customer.getEmail());
        assertThat(after.unreadCount()).isZero();
        assertThat(after.archivedCount()).isZero();
    }

    @Test
    void loyaltyV40RewardRedemptionAndPointExpiryStayLedgerConsistent() {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        AppUser customer = customer("v40-member-" + stamp + "@example.test", "V40 Member");
        AppUser admin = new AppUser();
        admin.setEmail("v40-admin-" + stamp + "@example.test");
        admin.setFullName("V40 Admin");
        admin.setPasswordHash("test-only");
        admin.setRole(Role.ADMIN);
        users.save(admin);

        var credited = loyalty.adminAdjust(customer.getId(), 500, "integration credit", admin.getEmail(), "127.0.0.1");
        assertThat(credited.balancePoints()).isEqualTo(500);
        assertThat(credited.lifetimePoints()).isZero();
        assertThat(credited.membershipTier()).isEqualTo("BRONZE");
        assertThat(loyalty.tierFor(500)).isEqualTo("SILVER");

        var customerSummary = loyalty.summary(customer.getEmail());
        assertThat(customerSummary.balancePoints()).isEqualTo(500);
        assertThat(customerSummary.lifetimePoints()).isZero();
        assertThat(customerSummary.membershipTier()).isEqualTo("BRONZE");

        UUID voucherReward = UUID.fromString("74000000-0000-0000-0000-000000000001");
        var redemption = loyalty.redeemReward(customer.getEmail(), voucherReward);
        assertThat(redemption.rewardType()).isEqualTo("VOUCHER");
        assertThat(redemption.voucherCode()).startsWith("RWD-RWD20K-");
        var afterVoucher = loyalty.summary(customer.getEmail());
        assertThat(afterVoucher.balancePoints()).isEqualTo(300);
        assertThat(afterVoucher.lifetimePoints()).isZero();
        assertThat(afterVoucher.membershipTier()).isEqualTo("BRONZE");
        Integer ownedVoucher = jdbc.queryForObject("select count(*) from voucher where owner_user_id=? and code=?", Integer.class, customer.getId(), redemption.voucherCode());
        assertThat(ownedVoucher).isEqualTo(1);

        jdbc.update("update loyalty_point_lot set expires_at=now()-interval '1 minute' where user_id=? and remaining_points>0", customer.getId());
        var expired = loyalty.summary(customer.getEmail());
        assertThat(expired.balancePoints()).isZero();
        Integer expireTx = jdbc.queryForObject("select count(*) from loyalty_transaction where user_id=? and transaction_type='EXPIRE'", Integer.class, customer.getId());
        assertThat(expireTx).isGreaterThanOrEqualTo(1);
    }

    @Test
    void paymentStartClaimIsIdempotentAndKeepsPayerOwnership() {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        AppUser payer = customer("v37-payer-" + stamp + "@example.test", "V37 Payer");
        Booking booking = new Booking();
        booking.setUserId(payer.getId());
        booking.setPurchaserUserId(payer.getId());
        booking.setShowtimeId(showtimes.findAll().stream().filter(st -> st.getStartTime().isAfter(Instant.now())).findFirst().orElseThrow().getId());
        booking.setStatus(BookingStatus.PENDING);
        booking.setTotalAmount(new BigDecimal("120000"));
        booking.setSeatAmount(new BigDecimal("120000"));
        booking.setConcessionAmount(BigDecimal.ZERO);
        booking.setDiscountAmount(BigDecimal.ZERO);
        booking.setPointsRedeemed(0);
        booking.setExpiresAt(Instant.now().plusSeconds(300));
        bookings.save(booking);

        String key="v37-it-"+UUID.randomUUID();
        var first=paymentAttempts.claim(booking.getId(),payer.getEmail(),"MOCK",key);
        var second=paymentAttempts.claim(booking.getId(),payer.getEmail(),"MOCK",key);
        assertThat(first.replayed()).isFalse();
        assertThat(second.replayed()).isTrue();
        assertThat(second.payment().getId()).isEqualTo(first.payment().getId());
        assertThat(first.payment().getPayerUserId()).isEqualTo(payer.getId());
        assertThat(payments.findByPayerUserIdOrderByCreatedAtDesc(payer.getId())).extracting(Payment::getId).contains(first.payment().getId());
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
