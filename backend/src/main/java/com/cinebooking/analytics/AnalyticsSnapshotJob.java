package com.cinebooking.analytics;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
public class AnalyticsSnapshotJob {
    private final JdbcTemplate jdbc;
    private final AnalyticsForecastingService analytics;
    private final boolean enabled;

    public AnalyticsSnapshotJob(
            JdbcTemplate jdbc,
            AnalyticsForecastingService analytics,
            @Value("${app.analytics.snapshot-enabled:true}") boolean enabled
    ) {
        this.jdbc = jdbc;
        this.analytics = analytics;
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${app.analytics.snapshot-scan-ms:900000}")
    @Transactional
    public void captureClosedPeriods() {
        if (!enabled) return;

        // Multi-replica safety: a backend can only snapshot cinema rows it acquires in this transaction.
        // Concurrent replicas skip rows already locked by another scheduler instance instead of duplicating work.
        List<UUID> cinemaIds = jdbc.query(
                "select id from cinema order by id for update skip locked",
                (rs, rowNum) -> rs.getObject("id", UUID.class)
        );
        for (UUID cinemaId : cinemaIds) analytics.captureClosedPeriods(cinemaId);
    }
}
