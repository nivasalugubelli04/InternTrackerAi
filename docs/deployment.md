# Deployment Guide

This guide covers the deployment process for InternTracker AI.

## CI/CD Pipeline
- Pull Requests to `main` trigger the `pr.yml` workflow (Lint, Typecheck, Test).
- Pushes to `main` trigger the `deploy-staging.yml` workflow, which builds Docker images and pushes them to the container registry (e.g., ECR).

## Environments
1. **Development**: Local Docker Compose with `.env`.
2. **Testing**: GitHub Actions with ephemeral DB/Redis.
3. **Staging**: Automated deployment from `main`. Uses isolated RDS/ElastiCache.
4. **Production**: Manual promotion from Staging. Uses AWS Secrets Manager for configuration.

## Manual Deployment Steps (Emergency)
If CI/CD fails, you can deploy manually:
1. `docker build -t interntracker-api:latest -f apps/api/Dockerfile .`
2. `docker push <your-registry>/interntracker-api:latest`
3. Update the ECS Task Definition to use the new image hash.
4. Force new deployment on the ECS Service.

## Mobile Deployment
- Android: `eas build --platform android --profile production`
- iOS: `eas build --platform ios --profile production` (Requires Apple Developer account)
