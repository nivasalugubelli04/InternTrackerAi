# Database Backups & Recovery

## PostgreSQL (Amazon RDS)

### Automated Backups

- Amazon RDS automated backups are enabled by default.
- **Retention Period**: Set to 7 days for staging, 30 days for production.
- **Backup Window**: Backups occur daily during a specified 30-minute window (e.g., 03:00 UTC).

### Point-In-Time Recovery (PITR)

- RDS supports PITR, allowing you to restore the database to any second within the retention period (up to the last 5 minutes).
- **RPO (Recovery Point Objective)**: ~5 minutes.
- **RTO (Recovery Time Objective)**: ~30-60 minutes depending on database size (time to spin up a new instance from snapshot).

### Restore Procedure

1. Navigate to the RDS Console.
2. Select the `intern-tracker-prod` instance.
3. Choose **Actions** -> **Restore to point in time**.
4. Select the desired restore time.
5. Launch as a new instance (e.g., `intern-tracker-prod-restored`).
6. Once the new instance is available, update the `DATABASE_URL` in AWS Secrets Manager to point to the new endpoint.
7. Restart the ECS services to pick up the new connection string.
