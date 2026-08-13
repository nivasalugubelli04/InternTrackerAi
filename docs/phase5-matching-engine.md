# Phase 5 — AI Matching Engine Documentation

## Overview

The **AI Matching Engine** is a deterministic, explainable, and horizontally scalable recommendation system designed for **InternTracker AI**. It analyzes user profile attributes (skills, preferred roles, preferred locations, preferred companies, CGPA, stipend preferences, and work modes) against normalized internship postings to calculate match scores, recommendation tiers, priorities, and verifiable explanation bullet points.

---

## Architectural Principles

1. **Deterministic & Explainable**: Every match score and reason bullet point directly references actual data fields from the user profile and job posting. Hallucinations are strictly prevented.
2. **Strategy Pattern & Pluggable Architecture**: The matching engine abstracts calculation logic behind the `IMatchingProvider` interface (`MATCHING_PROVIDER` DI token). Switching from the default `RuleBasedMatchingProvider` to `OpenAiMatchingProvider` or future ML models requires zero changes to core business logic.
3. **Asynchronous & Scalable**: Single-user matches can be computed synchronously, while system-wide batch recommendations are processed asynchronously via BullMQ (`matching-queue`).
4. **Caching Layer**: High-frequency queries and score calculations are cached in Redis to minimize database lookups.

---

## Architecture Diagram

```
User / API Request / Cron Job
         │
         ▼
 ┌────────────────────────────────┐
 │      Matching Controller       │
 └───────────────┬────────────────┘
                 │
                 ▼
 ┌────────────────────────────────┐
 │     Recommendation Service     │
 └───────────────┬────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│   Profile   │       │     Job     │
│  Analyzer   │       │  Analyzer   │
└──────┬──────┘       └──────┬──────┘
       │                     │
       └──────────┬──────────┘
                  ▼
   ┌───────────────────────────┐
   │ Keyword Normalizer Service│
   └──────────────┬────────────┘
                  ▼
   ┌───────────────────────────┐
   │    Scoring Engine Service │
   └──────────────┬────────────┘
                  ▼
   ┌───────────────────────────┐
   │     IMatchingProvider     │
   │  (RuleBased / OpenAI Stub)│
   └──────────────┬────────────┘
                  ▼
   ┌───────────────────────────┐
   │   Explanation Generator   │
   └──────────────┬────────────┘
                  ▼
   ┌───────────────────────────┐
   │  PostgreSQL DB + Redis    │
   └───────────────────────────┘
```

---

## Weighted Scoring Criteria

| Category                  | Default Weight | Description                                                                    |
| :------------------------ | :------------: | :----------------------------------------------------------------------------- |
| **Skills**                |    **35%**     | Overlap between user skills/resume keywords and job required/preferred skills. |
| **Role Match**            |    **20%**     | Similarity between user target roles and job title/department.                 |
| **Location**              |    **15%**     | Match between user preferred locations/work modes and job location/work mode.  |
| **Company Preference**    |    **10%**     | Boost if job company is in user preferred/tracked target list.                 |
| **CGPA**                  |    **10%**     | User CGPA vs job minimum requirements.                                         |
| **Stipend**               |     **5%**     | Offered stipend vs user minimum requested stipend.                             |
| **Experience / Duration** |     **5%**     | Educational level / year of study vs job experience expectations.              |

All weights are configurable via environment variables in `configuration.ts`:

```env
MATCHING_STRATEGY=rule-based
MATCH_WEIGHT_SKILLS=35
MATCH_WEIGHT_ROLE=20
MATCH_WEIGHT_LOCATION=15
MATCH_WEIGHT_COMPANY=10
MATCH_WEIGHT_CGPA=10
MATCH_WEIGHT_STIPEND=5
MATCH_WEIGHT_EXPERIENCE=5

MATCH_THRESHOLD_PERFECT=90
MATCH_THRESHOLD_STRONG=80
MATCH_THRESHOLD_GOOD=70
MATCH_THRESHOLD_EXPLORE=50

PRIORITY_THRESHOLD_HIGH=80
PRIORITY_THRESHOLD_MEDIUM=60
```

---

## Database Models

### `MatchScore`

Stores detailed component scores per user-job comparison.

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User`)
- `jobId`: UUID (Foreign Key -> `JobPosting`)
- `overallScore`: Float (0 – 100)
- `skillScore`: Float
- `educationScore`: Float
- `locationScore`: Float
- `cgpaScore`: Float
- `companyPreferenceScore`: Float
- `stipendScore`: Float
- `experienceScore`: Float
- `createdAt` / `updatedAt`: DateTime

### `Recommendation`

Persists prioritized recommendation items for user feeds.

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User`)
- `jobId`: UUID (Foreign Key -> `JobPosting`)
- `rank`: Int (1-indexed ranking for user)
- `priority`: Enum (`HIGH`, `MEDIUM`, `LOW`)
- `recommendationType`: Enum (`PERFECT_MATCH`, `STRONG_MATCH`, `GOOD_MATCH`, `EXPLORE`, `LOW_RELEVANCE`)
- `isViewed` / `isSaved` / `isDismissed`: Boolean flags

### `RecommendationReason`

Stores structured explanation reasons attached to a recommendation.

- `id`: UUID (Primary Key)
- `recommendationId`: UUID (Foreign Key -> `Recommendation`)
- `reasonType`: String (`SKILL`, `ROLE`, `LOCATION`, `COMPANY`, `CGPA`, `STIPEND`, `DURATION`)
- `description`: String (Verifiable explanation text)
- `weight`: Float

---

## API Endpoints

### 1. Trigger User Matching

`POST /api/v1/matching/run/:userId`
Runs the matching engine synchronously for a specific user ID and updates recommendations.

### 2. Trigger System-Wide Batch Matching

`POST /api/v1/matching/run-all`
Queues a background job in `matching-queue` (BullMQ) to process all active users system-wide.

### 3. Get Ranked Recommendations

`GET /api/v1/recommendations`
Supports query parameters:

- `recommendationType`: Filter by match tier (`PERFECT_MATCH`, `STRONG_MATCH`, etc.)
- `priority`: Filter by priority (`HIGH`, `MEDIUM`, `LOW`)
- `isSaved` / `isDismissed`: Filter saved or dismissed items
- `page` / `limit`: Pagination parameters

### 4. Get Recommendation Details

`GET /api/v1/recommendations/:id`
Returns full recommendation details, job details, company information, component scores, and explanation reasons. Automatically marks `isViewed: true`.

### 5. Get Job Match Score

`GET /api/v1/match-score/:jobId`
Retrieves cached or on-demand match score for the authenticated user and specified job posting.

---

## How to Extend with ML / LLM Providers

To add a new matching provider (e.g. custom BERT embeddings, LangChain, or OpenAI Fine-tuned model):

1. Create a service implementing `IMatchingProvider`:

```typescript
@Injectable()
export class CustomMlMatchingProvider implements IMatchingProvider {
  async calculateMatch(profile: NormalizedProfile, job: NormalizedJob): Promise<MatchResult> {
    // Custom vector similarity or LLM evaluation
  }
}
```

2. Register the provider in `MatchingModule` factory:

```typescript
{
  provide: MATCHING_PROVIDER,
  useFactory: (configService: ConfigService, ruleBased: RuleBasedMatchingProvider, customMl: CustomMlMatchingProvider) => {
    const strategy = configService.get<string>('matching.strategy');
    if (strategy === 'custom-ml') return customMl;
    return ruleBased;
  },
  inject: [ConfigService, RuleBasedMatchingProvider, CustomMlMatchingProvider],
}
```

No changes to `RecommendationService`, `ScoringEngineService`, or database models are necessary!
