# Secrets Management

InternTracker AI leverages AWS Secrets Manager (or equivalent cloud-native solution) for managing sensitive configuration values in Production and Staging.

## General Principles
- **No secrets in source control**: Never commit credentials, tokens, or private keys.
- **No secrets in Docker images**: Do not `COPY .env` into the Docker image or use `ENV` instructions for sensitive values in the Dockerfile.
- **Runtime Injection**: Secrets are injected into the container at runtime via task definitions.

## Secrets Managed via Secrets Manager
The following sensitive values should be stored in Secrets Manager rather than plain environment variables:

1. **Database & Cache**:
   - `DATABASE_URL` (PostgreSQL connection string containing password)
   - `REDIS_PASSWORD` (If using password-protected ElastiCache)

2. **Authentication**:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`

3. **Third-Party APIs**:
   - `AI_API_KEY` (OpenAI / Gemini)
   - `EMAIL_PASSWORD` / SendGrid API Key
   - `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`
   - `FIREBASE_PRIVATE_KEY`
   - `DATADOG_API_KEY` / `SENTRY_DSN`

## IAM Configuration
Ensure the ECS Task Role (or equivalent) has `secretsmanager:GetSecretValue` permissions scoped strictly to the specific secrets required for that environment (e.g., only `/production/interntracker/*` for Prod).
