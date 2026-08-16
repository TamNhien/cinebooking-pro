import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const bookingSuccess = new Counter('booking_success');
const holdSuccess = new Counter('hold_success');

export const options = {
  scenarios: {
    same_seat_race: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 100),
      iterations: 1,
      maxDuration: '45s',
    },
  },
  thresholds: {
    hold_success: ['count==1'],
    booking_success: ['count==1'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost/api';
const SHOWTIME_ID = __ENV.SHOWTIME_ID || '55555555-5555-5555-5555-555555555555';
const SEAT_ID = __ENV.SEAT_ID;

function json(res) { try { return res.json(); } catch (_) { return null; } }

export default function () {
  const suffix = `${__VU}-${Date.now()}`;
  const register = http.post(`${BASE}/auth/register`, JSON.stringify({
    email: `race-${suffix}@example.local`,
    password: 'Test@12345',
    fullName: `Race ${__VU}`,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(register, { 'register/login ready': r => r.status === 201 });
  const auth = json(register);
  if (!auth?.accessToken) return;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` };

  let seatId = SEAT_ID;
  if (!seatId) {
    const seatMap = http.get(`${BASE}/showtimes/${SHOWTIME_ID}/seats`, { headers });
    const body = json(seatMap);
    seatId = body?.seats?.find(s => s.status === 'AVAILABLE')?.id;
  }
  if (!seatId) return;

  const hold = http.post(`${BASE}/showtimes/${SHOWTIME_ID}/holds`, JSON.stringify({ seatIds: [seatId] }), { headers });
  if (hold.status === 200) holdSuccess.add(1);
  if (hold.status !== 200) return;

  const bookingHeaders = { ...headers, 'Idempotency-Key': `race-booking-${suffix}` };
  const booking = http.post(`${BASE}/bookings`, JSON.stringify({ showtimeId: SHOWTIME_ID, seatIds: [seatId], concessions: [], redeemPoints: 0 }), { headers: bookingHeaders });
  if (booking.status === 201) bookingSuccess.add(1);
  check(booking, { 'winner creates booking': r => r.status === 201 });
}
