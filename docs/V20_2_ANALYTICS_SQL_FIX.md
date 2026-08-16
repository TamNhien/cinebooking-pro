# CineBooking V20.2 - Analytics SQL fix

## Root cause
The Analytics V2 hourly-demand query used `hour` as a bare PostgreSQL output alias:

```sql
extract(hour from st.start_time at time zone 'Asia/Ho_Chi_Minh')::int hour
```

On PostgreSQL 18 this failed with `syntax error at or near "hour"`.

## Fix
V20.2 uses an explicit non-keyword alias and positional grouping:

```sql
extract(hour from (st.start_time at time zone 'Asia/Ho_Chi_Minh'))::int as hour_of_day
...
group by 1 order by 1
```

The JDBC mapper now reads `hour_of_day`.

The V20 smoke test also waits/retries the public API for up to about 60 seconds so an immediate run after `docker compose up --force-recreate` does not fail on a transient Nginx 502 while Spring Boot is still starting.

## Database
No new Flyway migration. Schema version remains V20.
