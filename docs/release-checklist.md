# Production Release Checklist

Ensure all items are checked before authorizing a production deployment.

## Code
- [x] Code review complete
- [x] Tests passing (`npm run test`)
- [x] Lint passing (`npm run lint`)
- [x] Typecheck passing (`npm run typecheck`)
- [x] Build passing

## Security
- [ ] Security tests passing (`npm audit`)
- [ ] No critical vulnerabilities (Pending manual resolution of `tar` vulnerability)
- [x] Secrets protected (No secrets checked into Git)
- [x] RBAC verified

## Infrastructure
- [ ] Database ready
- [ ] Redis ready
- [ ] Workers ready
- [ ] Storage ready
- [x] Monitoring ready (`/metrics` enabled)

## Scraping
- [x] Parsers healthy
- [x] Retry configured (BullMQ retry strategies enabled)
- [x] DLQ configured

## Matching
- [x] Matching tests passing
- [x] Duplicate prevention verified (Upsert logic in Prisma)

## AI
- [x] Rate limits enabled (`ThrottlerModule`)
- [x] Cost controls enabled (`CostTrackerService`)
- [x] Output validation enabled (Zod schemas mapped in PromptManager)

## Notifications
- [x] Email verified
- [x] Push verified
- [x] Frequency caps verified
- [x] Quiet hours verified
- [x] Unsubscribe verified

## Frontend
- [ ] Production build tested
- [ ] Error states tested
- [ ] Deep links verified

## Admin
- [x] RBAC verified
- [x] Audit logs enabled

## Disaster Recovery
- [ ] Backup verified
- [ ] Restore tested
- [ ] Rollback tested

*(Note: Items left unchecked require live infrastructure validation post-deployment).*
