# Rate Limiting Configuration

Limits are configured in environment variables and registered through `configuration.ts`.

## Profiles
- `default`: General API requests.
- `login`: Protects against brute-force (e.g., 5 req / minute).
- `register`: Protects against spam account creation.
- `forgot_password`: Protects against email spam.
- `admin`: Elevated limits for dashboard routes.
- `scraper`: Strict limits on manual scraper triggers.

## AI Rate Limiting Profiles
- `ai_chat`: Chat limits (e.g., 30 per hour).
- `ai_resume`: Expensive resume analysis (e.g., 3 per day).
- `ai_cover_letter`: Cover letter generation limits.
- `ai_interview`: Interview prep limits.

## Custom Guard
The custom `RateLimitGuard` enforces limits dynamically based on the `@RateLimitProfile` specified on the route handler.
