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
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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

    @Test
    void flywayMigratesRealPostgresToV29DemoCatalog() {
        Integer migrationCount = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success = true", Integer.class);
        String latest = jdbc.queryForObject(
                "select version from flyway_schema_history where success = true and version is not null order by installed_rank desc limit 1",
                String.class);
        Integer publicTables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
                Integer.class);

        assertThat(migrationCount).isGreaterThanOrEqualTo(26);
        assertThat(latest).isEqualTo("29");
        assertThat(publicTables).isGreaterThanOrEqualTo(30);

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
}
