# Environment Management Strategy

InternTracker AI strictly isolates environments to ensure stability and data security.

## Environments

### 1. Development
- **Purpose**: Local development and testing.
- **Resources**: Uses local `.env` and `docker-compose.yml` to spin up local instances of PostgreSQL and Redis.
- **Secrets**: Dummy values or developer-specific keys.

### 2. Testing (CI)
- **Purpose**: Automated testing during Pull Requests.
- **Resources**: Uses ephemeral Docker containers for PostgreSQL and Redis within GitHub Actions.
- **Secrets**: Injected via GitHub Actions environment variables (e.g., `intern_tracker_test`).

### 3. Staging
- **Purpose**: Pre-production validation, UAT.
- **Resources**: Dedicated Staging infrastructure (e.g., separate AWS RDS, separate ElastiCache, separate S3 buckets).
- **Secrets**: **MUST** use a separate parameter store or secrets manager path (e.g., `/staging/interntracker/`). Staging MUST NOT be able to connect to Production databases.

### 4. Production
- **Purpose**: Live environment for end users.
- **Resources**: Highly available, scaled infrastructure (AWS RDS Multi-AZ, ElastiCache, ECS/EKS).
- **Secrets**: Loaded at runtime via AWS Secrets Manager injected directly into the container context. No `.env` files are permitted on production servers.
