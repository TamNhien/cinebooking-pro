import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    browse_1000_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 250 },
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost/api';
const SHOWTIME_ID = __ENV.SHOWTIME_ID || '55555555-5555-5555-5555-555555555555';

export default function () {
  const movies = http.get(`${BASE}/movies`);
  check(movies, { 'movies 200': r => r.status === 200 });

  const showtimes = http.get(`${BASE}/showtimes`);
  check(showtimes, { 'showtimes 200': r => r.status === 200 });

  const seats = http.get(`${BASE}/showtimes/${SHOWTIME_ID}/seats`);
  check(seats, { 'seat map 200': r => r.status === 200 });
  sleep(Math.random() * 1.5 + 0.2);
}
