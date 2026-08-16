import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost/api';
const SHOWTIME_ID = __ENV.SHOWTIME_ID || '55555555-5555-5555-5555-555555555555';
const SEAT_ID = __ENV.SEAT_ID;

function json(res) { try { return res.json(); } catch (_) { return null; } }

export default function () {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const register = http.post(`${BASE}/auth/register`, JSON.stringify({
    email: `idem-${suffix}@example.local`,
    password: 'Test@12345',
    fullName: 'Idempotency Retry',
  }), { headers: { 'Content-Type': 'application/json' } });
  const auth = json(register);
  check(register, { 'temporary user registered': r => r.status === 201 && !!auth?.accessToken });
  if (!auth?.accessToken) return;

  const baseHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` };
  let seatId = SEAT_ID;
  if (!seatId) {
    const seatMap = http.get(`${BASE}/showtimes/${SHOWTIME_ID}/seats`, { headers: baseHeaders });
    const body = json(seatMap);
    seatId = body?.seats?.find(s => s.status === 'AVAILABLE')?.id;
  }
  check({ seatId }, { 'available seat found': x => !!x.seatId });
  if (!seatId) return;

  const hold = http.post(`${BASE}/showtimes/${SHOWTIME_ID}/holds`, JSON.stringify({ seatIds: [seatId] }), { headers: baseHeaders });
  check(hold, { 'seat hold acquired': r => r.status === 200 });
  if (hold.status !== 200) return;

  const key = `k6-idem-${suffix}`;
  const headers = { ...baseHeaders, 'Idempotency-Key': key };
  const payload = JSON.stringify({ showtimeId: SHOWTIME_ID, seatIds: [seatId], concessions: [], redeemPoints: 0 });
  const first = http.post(`${BASE}/bookings`, payload, { headers });
  const firstBody = json(first);
  check(first, {
    'first checkout is 201': r => r.status === 201,
    'first response is not replay': r => r.headers['Idempotency-Replayed'] === 'false',
  });
  if (!firstBody?.id) return;

  const replay = http.post(`${BASE}/bookings`, payload, { headers });
  const replayBody = json(replay);
  check(replay, {
    'retry is 200': r => r.status === 200,
    'retry is marked replay': r => r.headers['Idempotency-Replayed'] === 'true',
    'retry returns same booking': () => replayBody?.id === firstBody.id,
  });

  const conflict = http.post(`${BASE}/bookings`, JSON.stringify({ showtimeId: SHOWTIME_ID, seatIds: [seatId], concessions: [], redeemPoints: 1 }), { headers });
  check(conflict, { 'key reuse with changed payload is 409': r => r.status === 409 });

  const cancel = http.post(`${BASE}/bookings/${firstBody.id}/cancel`, null, { headers: baseHeaders });
  check(cancel, { 'temporary booking cancelled': r => r.status === 200 });
}
