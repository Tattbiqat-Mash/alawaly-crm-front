# API ARCHITECTURE & ENGINEERING RULES

> These rules define how API communication, server data, errors, caching, typing, and API-driven UI states must be implemented in the project.
>
> These rules apply to all API integrations unless explicitly overridden by `TASK.md`.

---

## 1. Architectural Flow

API communication must follow a strict unidirectional layered architecture.

```text
UI Component
    ↓
Feature Hook (TanStack Query)
    ↓
Feature API Layer
    ↓
Shared API Client
    ↓
Backend
```

### UI Component

Location:

```text
src/features/<feature>/components/
```

Responsibilities:

- Consume feature hooks.
- Render server data.
- Handle loading, error, empty, and success states.
- Handle user interactions.
- Must not execute HTTP requests directly.

### Feature Hook

Location:

```text
src/features/<feature>/hooks/
```

Responsibilities:

- Wrap API functions with TanStack Query.
- Define query and mutation behavior.
- Manage query keys.
- Manage cache behavior.
- Manage request parameters.
- Manage loading and mutation states.
- Control refetching and retry behavior.

### Feature API Layer

Location:

```text
src/features/<feature>/api/
```

Responsibilities:

- Contain feature-specific HTTP functions.
- Use the shared API client.
- Use centralized endpoint definitions.
- Define request and response handling.
- Perform API-level data transformation when required.

API functions must remain independent from React UI components.

### Shared API Client

Location:

```text
src/lib/api/
```

Responsibilities:

- Centralize the HTTP client.
- Configure the API base URL.
- Configure common headers.
- Handle request/response interceptors.
- Handle authentication when applicable.
- Handle locale headers.
- Normalize API errors.

---

## 2. Strict API Contract Rule

The AI Agent must never invent or assume API contracts.

### Prohibited

The agent must NOT:

- Invent endpoints.
- Guess endpoint paths.
- Guess HTTP methods.
- Guess request payloads.
- Guess response structures.
- Create speculative API hooks.
- Create API functionality that was not requested.
- Assume undocumented backend behavior.

### Required API Information

When implementing an API integration, the task should provide whenever applicable:

1. Endpoint path.
2. HTTP method.
3. Request parameters/body.
4. Sample response payload or schema.
5. Authentication requirements.
6. Expected error structure.

If required API information is missing:

- Do not invent it.
- Inspect the existing project for an established contract if one exists.
- If the contract still cannot be determined, request clarification before implementing the integration.

---

## 3. Centralized Endpoint Management

All API endpoint paths must be centralized.

Recommended location:

```text
src/config/endpoints.ts
```

Example:

```ts
export const endpoints = {
  doctors: "/doctors",
  doctor: (id: string | number) => `/doctors/${id}`,
};
```

### Rules

- Never hardcode endpoint paths inside UI components.
- Never duplicate endpoint strings across feature API files.
- Dynamic endpoints must use typed helper functions.
- Endpoint definitions must contain paths only and should not contain request logic.

---

## 4. API Client & Environment Configuration

Connection configuration must be centralized.

Example environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_WEBSITE_KEY=
NEXT_PUBLIC_ORIGIN_URL=
```

The exact variables may differ by project and should follow the project's existing configuration.

### Rules

- Never hardcode production API URLs.
- Never hardcode secret credentials.
- Never expose server-only secrets through `NEXT_PUBLIC_*`.
- Use environment variables for configurable connection values.
- Reuse the shared API client instead of creating multiple Axios instances unnecessarily.

---

## 5. Request Headers & Locale

Common request headers should be configured centrally.

Example:

```text
Content-Type: application/json
X-Website-Key: <configured value>
Origin: <configured value>
```

### Dynamic Locale

When the backend requires the active application language:

```text
Accept-Language: ar
Accept-Language: en
```

The language must be determined dynamically at runtime.

Do not:

- Hardcode a single language.
- Store the active language as a fixed environment value.
- Duplicate locale logic across feature API functions.

Locale handling should be centralized in the API client/interceptor whenever possible.

---

## 6. Error Handling

All API errors must be normalized through a centralized error-handling layer.

Recommended location:

```text
src/lib/api/errors.ts
```

Example normalized schema:

```ts
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  raw?: unknown;
}
```

### Error Categories

Handle at minimum:

```text
400 / 422 → Validation errors
401       → Unauthorized
403       → Forbidden
404       → Not found
500+      → Server error
Network   → Connectivity error
Timeout   → Request timeout
```

### Rules

- Do not expose raw Axios errors directly to UI components.
- Normalize errors before they reach the UI.
- Preserve server-provided validation errors when available.
- Localize user-facing fallback messages.
- Keep raw backend information available only when useful for debugging.
- UI components should consume a predictable `ApiError` structure.

---

## 7. TypeScript API Types

All API data must be strongly typed.

### Rules

- Never use `any` for API responses.
- Define feature-specific types inside:

```text
src/features/<feature>/types/
```

- Types should reflect the actual backend contract.
- Request and response types should be separated when their structures differ.
- Optional and nullable fields must be represented accurately.

Example:

```ts
export interface Doctor {
  id: number;
  name: string;
  image: string | null;
}
```

---

## 8. Data Transformation & Adapters

Backend data must be transformed at the API boundary when the backend structure is not appropriate for the UI.

Examples:

```text
snake_case → camelCase
Backend DTO → UI model
Nested response → normalized structure
Nullable API values → safe UI values
```

Transformers should be pure functions.

Recommended locations:

```text
src/features/<feature>/api/
```

or

```text
src/features/<feature>/utils/
```

### Rules

- Do not spread backend-specific transformations throughout UI components.
- Keep API-specific naming inside the API layer whenever practical.
- Normalize data before passing it to presentational components.
- Handle nullable and optional values safely.

---

## 9. TanStack Query

All client-side server state must use TanStack Query unless the task explicitly requires another mechanism.

### Queries

Use `useQuery` for reading server state.

### Mutations

Use `useMutation` for creating, updating, or deleting server state.

### Query Keys

Query keys must be structured and predictable.

Lists:

```ts
["doctors", params]
```

Details:

```ts
["doctor", id]
```

Related resources:

```ts
["services", { departmentId }]
```

### Rules

- Query keys must uniquely represent the requested data.
- Do not use random or unstable query keys.
- Do not include unnecessary values in query keys.
- Reuse consistent key structures across a feature.

---

## 10. Query Guards

Detail queries must prevent invalid requests.

Example:

```ts
useQuery({
  queryKey: ["doctor", id],
  queryFn: () => getDoctor(id),
  enabled: Boolean(id),
});
```

Rules:

- Do not execute detail requests with undefined, null, or invalid identifiers.
- Use `enabled` guards where request prerequisites are not immediately available.
- Validate required parameters before executing requests.

---

## 11. Cache & Refetch Strategy

Caching must be intentional.

### Default Guidance

For static or infrequently changing resources:

```ts
staleTime: 5 * 60 * 1000
```

Examples:

- Services
- Doctors
- Categories
- Clinic information
- Static configuration

### Window Focus

Avoid unnecessary refetching when switching browser tabs unless the feature requires real-time freshness.

Default:

```ts
refetchOnWindowFocus: false
```

### Important

Do not blindly apply the same cache strategy to every feature.

For frequently changing data, real-time data, dashboards, or user-specific state, use a strategy appropriate to the feature.

---

## 12. Retry Strategy

Retries must be controlled.

### Client Errors

Do not retry:

```text
400
401
403
404
409
422
```

These generally represent requests that will not succeed by repeating them.

### Server / Network Errors

Allow limited retries for:

```text
Network failures
Timeouts
5xx server errors
```

Default:

```ts
retry: 1
```

Do not create aggressive retry loops.

---

## 13. Cache Invalidation

Mutations that change server state must invalidate affected queries.

Examples:

```ts
queryClient.invalidateQueries({
  queryKey: ["doctors"],
});
```

### Rules

After:

```text
Create
Update
Delete
```

identify the affected cached queries and invalidate or update them appropriately.

Prefer targeted invalidation over clearing unrelated application caches.

---

## 14. Loading States

Every UI feature that fetches asynchronous server data must provide an appropriate loading state.

Possible layers:

```text
Next.js route loading.tsx
        ↓
Feature Skeleton
        ↓
TanStack Query loading state
```

Feature-specific skeletons should live near their feature:

```text
src/features/<feature>/components/<feature>-skeleton.tsx
```

### Rules

- Loading UI must match the surrounding design.
- Avoid large layout shifts.
- Skeletons should represent the approximate final content structure.
- Do not display raw loading text when a meaningful skeleton is appropriate.

---

## 15. Empty States

Empty server responses must be handled intentionally.

Examples:

```text
items: []
results: []
null resource
no search results
no filtered results
```

The UI should provide a meaningful empty state instead of:

- Blank whitespace.
- Broken layouts.
- Undefined values.
- Raw JSON.
- Generic browser errors.

Feature-specific empty states should live near the feature when reusable.

Example:

```text
src/features/<feature>/components/<feature>-empty.tsx
```

Empty-state content must be localized when the project supports multiple languages.

---

## 16. Error UI States

API errors must produce intentional UI states.

The UI should distinguish when appropriate between:

```text
Validation Error
Unauthorized
Forbidden
Not Found
Server Error
Network Error
Timeout
```

The UI must not expose technical Axios or backend error objects directly to users.

Where appropriate, provide:

- Localized message.
- Retry action.
- Reset action.
- Navigation action.
- Form field errors.

---

## 17. API Integration & Existing UI Preservation

When connecting an existing UI to an API, the default objective is:

```text
Replace static data
        ↓
With real API data
```

without unnecessarily changing the existing visual implementation.

### Rules

During API integration, do not unnecessarily modify:

- Colors.
- Typography.
- Layout.
- Spacing.
- Animations.
- Backgrounds.
- Existing components.
- Responsive behavior.
- Visual hierarchy.

The agent should bind dynamic data to the existing UI rather than redesigning it.

### Exception

Minimal UI adjustments are allowed when required to correctly accommodate:

- Variable text length.
- Missing data.
- Dynamic images.
- Different item counts.
- Loading states.
- Error states.
- Responsive content.

Such changes should remain minimal and task-focused.

---

## 18. API-Driven Media Fallbacks

When an API provides media such as:

```text
image
video
thumbnail
avatar
```

the UI must safely handle:

```text
null
undefined
empty string
invalid URL
missing media
```

Use an appropriate local fallback when the project provides one.

Do not allow missing API media to break the layout.

---

## 19. SEO Data from API

When an API provides SEO metadata for a page, the API-provided metadata should take precedence over static defaults.

Example:

```json
{
  "seo": {
    "title": "...",
    "description": "...",
    "keywords": "...",
    "image": "..."
  }
}
```

For dynamic routes, use Next.js `generateMetadata()` where appropriate.

Example:

```ts
export async function generateMetadata(): Promise<Metadata> {
  // Fetch required page data
  // Extract SEO metadata
  // Return Next.js Metadata
}
```

### Fallback

If the API does not provide a required SEO field:

```text
API SEO
   ↓
Static project defaults
   ↓
Safe fallback
```

Never leave required metadata undefined when a project default exists.

---

## 20. Server vs Client API Usage

API requests must be executed in the appropriate rendering layer.

### Server Components

Prefer server-side fetching when:

- Data is required for initial page rendering.
- SEO depends on the data.
- The data does not require client interactivity.
- The request can safely execute on the server.

### Client Components

Use TanStack Query when:

- Data requires client-side interaction.
- Data needs client caching.
- Refetching is controlled by the client.
- Mutations are required.
- Filters/search/pagination require interactive server state.

Do not introduce client-side fetching merely because it is familiar.

---

## 21. Pagination, Filtering & Search

When APIs support pagination, filtering, or search:

- Keep request parameters typed.
- Include relevant parameters in query keys.
- Preserve URL state when the feature requires shareable/filterable URLs.
- Do not hide pagination/filter state inside unrelated global state.
- Avoid unnecessary requests for incomplete or invalid search input.

Example:

```ts
["doctors", {
  page,
  search,
  departmentId,
}]
```

---

## 22. Authentication & Authorization

Authentication requirements must follow the project's established authentication architecture.

Rules:

- Do not invent authentication mechanisms.
- Do not expose tokens or secrets in client-side code unnecessarily.
- Centralize authentication headers/interceptors when applicable.
- Handle `401` and `403` consistently.
- Follow the project's existing session/token strategy.

---

## 23. API Security

Never:

- Hardcode secrets.
- Commit private API credentials.
- Expose server-only environment variables to client components.
- Trust client-side authorization as the sole security mechanism.
- Log sensitive authentication information.
- Send unnecessary sensitive data to the client.

The backend remains responsible for authorization and data access control.

---

## 24. API Folder Structure

Recommended feature structure:

```text
src/
├── config/
│   └── endpoints.ts
│
├── lib/
│   └── api/
│       ├── axios.ts
│       └── errors.ts
│
└── features/
    └── <feature>/
        ├── api/
        │   ├── get-<feature>.ts
        │   └── ...
        │
        ├── hooks/
        │   ├── use-<feature>.ts
        │   └── ...
        │
        ├── types/
        │   ├── <feature>.ts
        │   └── ...
        │
        ├── utils/
        │   └── ...
        │
        └── components/
            ├── <feature>.tsx
            ├── <feature>-skeleton.tsx
            └── <feature>-empty.tsx
```

The exact structure may adapt to the existing project architecture.

---

## 25. Implementation Sequence

When implementing a new API integration, follow this order:

```text
1. Understand API Contract
        ↓
2. Inspect Existing Architecture
        ↓
3. Add Endpoint Definition
        ↓
4. Define TypeScript Types
        ↓
5. Implement API Function
        ↓
6. Implement TanStack Query Hook
        ↓
7. Connect UI
        ↓
8. Handle Loading State
        ↓
9. Handle Empty State
        ↓
10. Handle Error State
        ↓
11. Handle Localization
        ↓
12. Verify Existing UI Preservation
        ↓
13. Verify TypeScript / Lint / Build
```

Do not skip architectural layers simply because the integration appears small.

---

## 26. Rules for AI Agents

The AI Agent must:

- Inspect the existing API architecture before creating new files.
- Reuse existing API clients.
- Reuse existing query patterns.
- Reuse existing error handling.
- Reuse existing types when appropriate.
- Follow existing naming conventions.
- Avoid duplicate API infrastructure.
- Never invent undocumented API behavior.
- Never modify unrelated API integrations.
- Never redesign existing UI during API binding.
- Keep API logic outside presentational components.
- Keep changes limited to the requested task.

When existing project patterns conflict with these rules, preserve the established project architecture unless `TASK.md` explicitly requests migration or refactoring.

---

## 27. Rule Priority

When API-related instructions conflict, use this priority:

```text
TASK.md
    ↓
Existing Backend/API Contract
    ↓
PROJECT_CONTEXT.md
    ↓
API_ARCHITECTURE.md
    ↓
PROJECT_RULES.md
    ↓
AI_AGENT_WORKFLOW.md
```

The actual backend contract always takes precedence over assumptions.

Never fabricate an API contract to satisfy a rule.

---

## 28. Final API Verification

Before considering an API task complete, verify:

- [ ] Correct endpoint is used.
- [ ] Correct HTTP method is used.
- [ ] Request parameters/body are correct.
- [ ] Response types match the API contract.
- [ ] No `any` is used for API data.
- [ ] API function uses the shared API client.
- [ ] Endpoint is centralized.
- [ ] React Query hook is implemented correctly when applicable.
- [ ] Query keys are stable and meaningful.
- [ ] Invalid queries are guarded.
- [ ] Cache invalidation is handled for mutations.
- [ ] Retry behavior is appropriate.
- [ ] Loading state exists.
- [ ] Empty state exists when applicable.
- [ ] Error state exists.
- [ ] API errors are normalized.
- [ ] User-facing errors are localized.
- [ ] Existing UI design is preserved.
- [ ] Missing/null API data is handled safely.
- [ ] SEO metadata uses API data when applicable.
- [ ] TypeScript passes.
- [ ] Lint passes when applicable.
- [ ] Build passes when applicable.