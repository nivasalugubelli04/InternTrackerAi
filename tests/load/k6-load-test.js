import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users for 1 min
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

export default function () {
  // 1. Health check (simulate LB check)
  const healthRes = http.get(`${BASE_URL}/health/live`);
  check(healthRes, { 'health is 200': (r) => r.status === 200 });

  // 2. Feed endpoint (heavy read)
  // Assuming public access is allowed, otherwise this requires an auth token
  const feedRes = http.get(`${BASE_URL}/opportunities?limit=20`);
  check(feedRes, { 'feed is 200': (r) => r.status === 200 });

  // 3. Search endpoint
  const searchRes = http.get(`${BASE_URL}/opportunities?q=software&limit=10`);
  check(searchRes, { 'search is 200': (r) => r.status === 200 });

  sleep(1);
}
