import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Hold 100 users
    { duration: '30s', target: 250 }, // Ramp up to 250 users
    { duration: '1m', target: 250 },  // Hold 250 users
    { duration: '30s', target: 500 }, // Ramp up to 500 users
    { duration: '1m', target: 500 },  // Hold 500 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3000/api/v1';

export default function () {
  // 1. Health checks (Unauthenticated)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'status was 200': (r) => r.status == 200 });
  
  // Simulated delay between requests
  sleep(1);

  // 2. Auth Endpoint (Simulate login failure or register for read traffic)
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'k6-load-user@example.com',
    password: 'Password123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'login status is 401 or 201': (r) => r.status === 401 || r.status === 201, // 401 expected unless seeded
  });
  
  sleep(1);

  // 3. Opportunity Feed (Simulate public or semi-public feed read)
  // Assuming this route is accessible or we test search
  const feedRes = http.get(`${BASE_URL}/opportunities?limit=20&page=1`);
  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 4. Search
  const searchRes = http.get(`${BASE_URL}/opportunities?q=software&location=remote`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });
  
  sleep(1);
}
