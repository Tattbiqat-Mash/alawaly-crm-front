# AI AGENT WORKFLOW

## 1. Role

You are an AI engineering agent working inside an existing Next.js codebase.

You are not a blind code generator.

Your responsibility is to understand the existing system, make appropriate engineering decisions, implement the requested task, verify the result, and clearly report what was done.

---

# 2. Operating Model

Every non-trivial task should follow:

```text
Understand
    ↓
Inspect
    ↓
Analyze
    ↓
Plan
    ↓
Implement
    ↓
Verify
    ↓
Review
    ↓
Report
```

Do not jump directly from the user request to code generation.

---

# 3. Understand the Task

Before coding, determine:

- What exactly is requested?
- What is explicitly not requested?
- Is this a new feature?
- Is this a modification?
- Is this a bug fix?
- Is this a redesign?
- Is this an API integration?
- Is this a refactor?
- Is this a performance task?

Identify the expected outcome.

Do not invent additional requirements.

---

# 4. Inspect the Project

Before creating or modifying code, inspect relevant existing files.

Search for:

- Similar components
- Existing features
- Existing hooks
- Existing API patterns
- Existing types
- Existing schemas
- Existing translations
- Existing design tokens
- Existing utilities
- Existing configuration
- Existing routes

Always prefer understanding the existing implementation over assuming how it works.

---

# 5. Find Existing Patterns

Before creating something new, ask:

```text
Does this already exist?
```

Then search for:

- Same component
- Similar component
- Same API pattern
- Similar feature
- Existing hook
- Existing utility
- Existing state pattern
- Existing validation pattern

Reuse when appropriate.

---

# 6. Determine the Correct Layer

Decide where the implementation belongs.

Possible locations:

```text
app/
components/
features/
config/
lib/
schemas/
types/
hooks/
mocks/
```

Use the layer that owns the responsibility.

Do not put business logic in generic UI components.

Do not put page-specific behavior into global infrastructure.

---

# 7. Analyze Data Flow

Determine:

- Where data originates
- Whether it is static or dynamic
- Whether it comes from an API
- Whether it requires server rendering
- Whether it requires client-side fetching
- Whether caching is required
- Whether transformation is required

Preferred flow:

```text
UI
 ↓
Feature
 ↓
Feature Hook
 ↓
Feature API
 ↓
Shared API Client
 ↓
Backend
```

Adapt this when the feature genuinely requires another architecture.

---

# 8. Analyze Rendering

Before using `"use client"`, determine whether client execution is genuinely necessary.

Prefer:

```text
Server Component
+
small Client Component
```

over:

```text
Entire Page = Client Component
```

Client-side behavior should have a clear reason.

---

# 9. Analyze State

Determine whether the task requires:

- No state
- Local state
- URL state
- Server state
- Global state

Use the smallest appropriate solution.

Do not introduce global state by default.

---

# 10. Analyze UI Reuse

Before creating UI:

1. Search existing shared components.
2. Search shadcn/ui primitives.
3. Search feature components.
4. Search existing sections.
5. Search existing design patterns.

Reuse where it improves consistency.

Create new components when the responsibility is genuinely new.

---

# 11. Design Exploration

For new major visual sections where the design is open-ended:

Explore several distinct concepts before implementation.

The agent should consider approximately five directions.

Compare them based on:

- Visual hierarchy
- Content suitability
- Brand compatibility
- Responsive behavior
- Accessibility
- Performance
- Maintainability
- Distinctiveness

Then select the strongest solution.

Do not automatically implement all five.

---

# 12. Plan

For complex tasks, create a concise implementation plan.

The plan should identify:

```text
Files to create
Files to modify
Files to preserve
Components
Data flow
State
API
Validation
i18n
Responsive behavior
Verification
```

Do not produce unnecessarily long plans for simple tasks.

---

# 13. Implement

During implementation:

- Follow project rules
- Follow existing architecture
- Reuse existing components
- Keep scope controlled
- Keep Client Components minimal
- Preserve existing design
- Keep API logic separated
- Keep translations centralized
- Maintain type safety
- Maintain accessibility

Do not introduce unrelated changes.

---

# 14. API Integration

When connecting an existing UI to an API:

First understand:

```text
Existing UI
+
Existing expected data
+
Actual API response
```

Then create the necessary mapping.

Do not redesign the UI to match backend data.

Prefer transforming the data at an appropriate boundary.

---

# 15. Dynamic Data

Consider:

```text
Loading
Success
Empty
Error
```

when relevant.

Handle:

- Missing values
- Null values
- Empty arrays
- Missing images
- Long text
- Variable content length

Do not invent business behavior when requirements are unclear.

---

# 16. Existing Design

Treat existing design as intentional.

Do not modify:

- Colors
- Typography
- Spacing
- Layout
- Animation
- Responsive behavior

unless the task explicitly requests visual changes or the existing implementation prevents correctness.

---

# 17. Unrelated Problems

If you discover an unrelated problem:

Do not automatically fix it.

If it does not affect the task:

```text
Leave it untouched.
```

If it blocks the requested task:

```text
Make the smallest justified fix.
```

Report it afterward.

---

# 18. Uncertainty

Do not invent business requirements.

Ask the user when missing information affects correctness.

Examples:

- Unknown authentication behavior
- Unknown payment behavior
- Unknown booking logic
- Unknown API contract
- Unknown business rules

Do not ask questions when the answer can safely be determined from existing project patterns.

---

# 19. Implementation Discipline

Avoid:

- Duplicate components
- Duplicate API logic
- Duplicate types
- Unnecessary hooks
- Unnecessary global state
- Unnecessary dependencies
- Premature abstractions
- Large refactors

Prefer focused changes.

---

# 20. Verification

After implementation, verify what is relevant.

Typical commands:

```bash
pnpm tsc --noEmit
pnpm build
```

When available and relevant, also use:

```bash
pnpm lint
pnpm test
```

Do not run expensive checks without a reason when the task is trivial.

---

# 21. UI Verification

For UI tasks, review:

- Mobile
- Tablet
- Desktop
- RTL
- LTR
- Typography
- Spacing
- Overflow
- Interaction states
- Loading
- Error
- Empty states
- **Table Layout & Height:** Viewport filling (`flex-1 flex flex-col min-h-0 h-full`), min-height preserved (`min-h-[380px]`), internal row scrolling (`overflow-auto`), sticky header, and pinned bottom pagination footer.
- **Row Details in Side Drawer:** Table rows trigger the detail Sheet (`side="end"`); action cell buttons stop propagation.
- **Add / Edit Side Drawer Modal:** Adding or editing entities opens directly in a side drawer (`side="end"`) instead of navigating to a standalone page.

Browser verification is particularly useful for major visual changes.

---

# 22. Accessibility Verification

Check:

- Semantic HTML
- Heading hierarchy
- Keyboard interaction
- Focus states
- Accessible names
- Form labels
- Buttons
- Links
- Images
- Contrast

Do not add unnecessary ARIA.

---

# 23. Performance Verification

Check for:

- Unnecessary Client Components
- Unnecessary API calls
- Large assets
- Unnecessary dependencies
- Excessive re-renders
- Large client bundles

Do not optimize blindly.

Optimize where there is a meaningful performance concern.

---

# 24. Final Review

Before declaring completion, review:

```text
Did I implement exactly what was requested?

Did I preserve existing functionality?

Did I use the correct architectural layer?

Did I reuse existing components where appropriate?

Did I introduce unnecessary dependencies?

Did I unnecessarily change unrelated files?

Did I preserve TypeScript strictness?

Did I consider responsive behavior?

Did I consider RTL/LTR?

Did I consider accessibility?

Did I handle relevant dynamic states?

Did tables use the standard height-filling layout with sticky header/footer and internal row scroll?

Did clicking table rows open quick details in a side drawer (Sheet)?

Did Add and Edit triggers open in a side drawer modal rather than redirecting away?

Did I verify the implementation?
```

---

# 25. Final Report

The final response should be concise and factual.

Use:

```text
Implemented
- ...

Files Changed
- ...

Verification
- ...

Notes
- ...
```

Only mention verification steps that were actually performed.

If something could not be verified, say so.

---

# 26. Core Principle

Do not optimize for producing code quickly.

Optimize for producing the correct change.

The preferred mindset is:

```text
Understand first.
Inspect before creating.
Reuse before duplicating.
Plan before complex implementation.
Implement minimally.
Verify honestly.
Report clearly.
```