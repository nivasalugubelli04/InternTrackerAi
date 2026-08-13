# Incident Response Plan

This document dictates the procedure for responding to production incidents.

## Incident Priorities

### P1 Critical
- **Definition**: Complete system outage. Core user journeys (Login, Matching, API) are completely broken for all users.
- **Detection**: Automated paging from CloudWatch (5xx > 5%).
- **Immediate Mitigation**: Rollback to the previous stable release. Scale up resources.
- **Communication**: Post to `#incidents` Slack channel immediately. Update Status Page.
- **Investigation & Recovery**: All available engineers drop current work to investigate. Restore database from backup if corruption is detected.

### P2 High
- **Definition**: A major feature is broken for a large subset of users (e.g., AI Analysis failing, Notifications not sending).
- **Detection**: Alerts for specific feature failures or Queue backlogs.
- **Immediate Mitigation**: Disable the broken feature via Feature Flags to prevent cascading failures.
- **Communication**: Notify `#engineering` Slack channel.

### P3 Medium
- **Definition**: A minor feature is broken, or a major feature is degraded (e.g., latency is high but requests still succeed).
- **Detection**: Latency alerts (p95 > 1000ms).
- **Mitigation**: Investigate logs during business hours. Optimize queries or scale read replicas.

### P4 Low
- **Definition**: Non-user-facing issues (e.g., a single scraper is failing, minor UI bugs).
- **Mitigation**: Create a Jira ticket for the next sprint.

## Incident Lifecycle
1. **Detect**: Alert triggers or user reports issue.
2. **Declare**: Acknowledge the page and declare the incident priority.
3. **Mitigate**: Focus on stopping the bleeding (Rollback, Disable Feature, Scale Up). Do NOT focus on the root cause fix until the system is stable.
4. **Investigate**: Find the root cause using `/metrics` and structured logs.
5. **Post-Mortem**: Required for all P1 and P2 incidents within 48 hours. Document what went wrong, how it was detected, and what actions will prevent recurrence.
