# Staging Environment

The Staging environment is an exact replica of Production, scaled down to save costs. It is used to catch bugs and verify features before they are promoted to Production.

## Key Differences from Production
- **Infrastructure Scale**: Uses smaller compute/database instances (e.g., t3.micro instead of m5.large).
- **Data Isolation**: Connects to a completely isolated database and cache. It does NOT use production data. Data may be periodically cloned from production (and sanitized) for realistic testing.
- **Logging/Monitoring**: Debug logging may be enabled if necessary, though ideally it should mirror production log levels.
- **External Services**: Uses sandbox or test keys for external integrations (e.g., Twilio test credentials, Stripe test mode).

## Deployment Flow
1. Developer merges PR into `main`.
2. GitHub Actions (`deploy-staging.yml`) builds the Docker image with the commit SHA.
3. The image is deployed automatically to the Staging cluster.
4. QA/Developers verify the changes on the staging URL (e.g., `staging.interntracker.ai`).

## Configuration Needs
When provisioning Staging, ensure the following are created:
- A staging-specific IAM Role.
- Staging Secrets Manager paths.
- A staging RDS instance and ElastiCache instance.
- A staging S3 bucket.
