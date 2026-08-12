# Production Runbook (Security & Incident Response)

## Security Architecture
- **JWT**: Stateless Access (15m) + Stateful Refresh (7d) hashed in DB.
- **RBAC**: Enforced at the controller level via `RolesGuard`.
- **Throttling**: 100/min globally. 5/min on Auth endpoints. 30/hour on AI endpoints.
- **File Uploads**: Strictly validated against MIME types. 5MB limit.

## Incident Response
1. **Initial Triaging**: Assess impact via CloudWatch.
2. **Containment**: Disable affected features via Admin Feature Flags.
3. **Investigation**: Search CloudWatch Logs using the specific `requestId` or `userId`.
4. **Remediation**: Rollback deployment or apply hotfix.
5. **Post-Mortem**: Document root cause and deploy preventative measures.
