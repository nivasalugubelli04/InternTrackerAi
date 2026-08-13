# CI/CD Workflows

InternTracker AI utilizes GitHub Actions for continuous integration and staging deployments.

## Pull Request Checks (`.github/workflows/pr.yml`)
Runs on PRs targeting `main` or `develop`.

**Pipeline Flow**:
1. Checks out code and sets up Node 20.
2. Installs dependencies (`npm ci`).
3. Runs Security Audit (`npm audit`).
4. Runs Linting (`npm run lint`).
5. Runs Type Checking (`tsc`).
6. Builds the API and Admin apps.
7. Runs unit tests (`npm run test`) with an ephemeral PostgreSQL/Redis container setup.
8. Builds production Docker images (`interntracker-api:pr-test` and `interntracker-admin:pr-test`) to guarantee they can be built successfully before merging.

*Failure at any step will block the PR from being merged.*

## Staging Deployment (`.github/workflows/deploy-staging.yml`)
Runs on pushes to the `main` branch.

**Pipeline Flow**:
1. Checks out code and installs dependencies.
2. Builds Docker images tagged with the commit SHA (`${{ github.sha }}`) and a latest pointer (`staging`).
3. **(Placeholder)** Pushes the tagged images to the container registry (e.g. AWS ECR).
4. **(Placeholder)** Triggers a deployment (e.g. AWS ECS Update Service) to the Staging environment using the newly pushed images.

**Security Consideration**: No secrets are embedded in the Docker image or the workflow files. Deployment credentials should be injected via GitHub Secrets.
