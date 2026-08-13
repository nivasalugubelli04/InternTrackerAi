# Security Hardening Guide

## CORS and Headers
- Strict CORS is enforced. In production, the `*` wildcard origin is rejected.
- CSP and strict HTTP headers are managed by `helmet`.

## Rate Limiting
- The API applies route-specific rate limits using `@RateLimitProfile('profileName')`.
- Limits are dynamically configured in `configuration.ts` avoiding hardcoded business logic limits.

## Authentication & RBAC
- JWT Auth is enforced globally via `JwtAuthGuard`. 
- Admin routes are secured by `RolesGuard` mapping specific user roles.
- Privilege separation is maintained between `ADMIN` and `SUPER_ADMIN`.

## Input Validation
- Global `ValidationPipe` drops any undeclared payload properties (`whitelist: true`) and rejects unmapped objects completely (`forbidUnknownValues: true`).
- Max request body size is limited to 5MB at the Fastify adapter level.

## SSRF Protection
- Scraper inputs and Resume Upload URLs are validated via a custom `@IsSafeUrl()` class validator which blocks internal IPs, loopback, and cloud metadata APIs.
