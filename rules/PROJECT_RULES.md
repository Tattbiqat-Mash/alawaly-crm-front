# PROJECT RULES

## 1. Purpose

These rules define the global engineering, architecture, UI, UX, performance, accessibility, SEO, internationalization, and AI-agent standards for modern Next.js projects.

These rules are project-independent.

They must not contain:

- Project-specific business requirements
- Client-specific requirements
- Specific pages
- Specific features
- Specific API endpoints
- Specific branding
- Specific content
- Project-specific design decisions

Project-specific information belongs in `PROJECT_CONTEXT.md`.

Task-specific requirements belong in `TASK.md`.

---

# 2. Core Principles

The project should remain:

- Simple
- Maintainable
- Scalable
- Type-safe
- Accessible
- Responsive
- Performant
- SEO-friendly
- Internationalization-ready
- RTL/LTR compatible when required
- Consistent
- Production-ready
- Agent-friendly

Prefer the simplest correct solution.

Do not introduce complexity simply because it is technically possible.

Avoid:

- Premature abstraction
- Over-engineering
- Unnecessary dependencies
- Duplicate implementations
- Unnecessary global state
- Unrelated refactoring

The goal is not maximum code.

The goal is the smallest correct production-ready implementation.

---

# 3. Technology Stack

The default ecosystem for these projects is:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI through shadcn/ui
- Lucide React
- Framer Motion
- React Hook Form
- Zod
- Axios
- TanStack Query
- next-intl
- nuqs

A project may use only a subset of these technologies.

Do not install a dependency merely because it is listed here.

Always inspect the existing project before adding a package.

Prefer:

1. Existing project utilities
2. Existing dependencies
3. Native browser APIs
4. Next.js capabilities
5. React capabilities
6. Small local utilities

before introducing a new dependency.

---

# 4. Next.js Architecture

Use the Next.js App Router for modern Next.js projects unless the existing project explicitly uses another architecture.

Prefer:

- Server Components by default
- Server-side rendering where appropriate
- Static rendering where appropriate
- Streaming where useful
- Route-level loading and error handling
- Native Next.js metadata
- Next.js image optimization
- Next.js font optimization

Do not use Client Components by default.

Client Components must have a real client-side requirement.

---

# 5. Server Components

Server Components are the default.

Use Client Components only when necessary for:

- User interaction
- React state
- Event handlers
- Browser APIs
- Client-only libraries
- Client-side data fetching
- React Hook Form
- TanStack Query
- Interactive client-side behavior

Prefer the smallest possible Client Component boundary.

Do not convert an entire page to a Client Component when only one child requires client execution.

Prefer:

```text
Server Page
    ↓
Server Section
    ↓
Small Client Component
```

over:

```text
Client Page
    ↓
Everything runs on the client
```

---

# 6. Project Structure

A preferred structure is:

```text
src/
├── app/
│   └── [locale]/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── sections/
│   └── shared/
├── features/
├── config/
├── lib/
├── schemas/
├── types/
├── hooks/
└── mocks/
```

Adapt the structure to the project's actual needs.

Do not create empty directories simply to satisfy a theoretical architecture.

---

# 7. App Directory Responsibilities

`app/` is responsible primarily for:

- Routing
- Layouts
- Pages
- Route-level loading
- Route-level errors
- Not-found behavior
- Metadata
- Page composition

Avoid placing large amounts of business logic directly inside page files.

Pages should primarily compose features and shared components.

---

# 8. Feature-Based Architecture

Business-specific functionality should live inside:

```text
src/features/
```

A feature may contain:

```text
feature-name/
├── components/
├── hooks/
├── api/
├── schemas/
├── types/
├── mocks/
└── index.ts
```

Only create the directories actually required.

Feature boundaries should represent real business/domain responsibilities.

Do not place business-specific logic into generic shared components.

---

# 9. Component Responsibilities

Use the following general separation:

### `components/ui`

Generic reusable UI primitives.

### `components/layout`

Site-wide layout components.

### `components/navigation`

Navigation-related components.

### `components/sections`

Reusable website sections that are not tied to a specific business feature.

### `components/shared`

Reusable components shared across multiple features.

### `features`

Domain-specific functionality.

### `lib`

Shared technical infrastructure and utilities.

### `config`

Static project configuration.

---

# 10. Component Design

Components should have a clear responsibility.

Prefer:

- Composition
- Small focused components
- Explicit props
- Reusable primitives
- Clear boundaries

Avoid:

- Giant components
- Components with dozens of unrelated props
- Deep conditional rendering
- Duplicate UI
- Premature generic abstractions

Before creating a component, search the project for an existing component that solves the same problem.

Reuse when appropriate.

Do not force reuse when it makes the existing component significantly harder to understand.

---

# 11. shadcn/ui

Use shadcn/ui when an appropriate primitive exists.

Prefer extending or composing existing primitives over creating duplicate implementations.

Do not introduce another UI component library when shadcn/ui already provides the required foundation.

Custom domain components are allowed when the UI represents application-specific behavior.

---

# 12. Tailwind CSS

Use Tailwind CSS as the primary styling system.

Avoid introducing additional styling systems.

Avoid unnecessary inline styles.

Inline styles may be used when styling is genuinely dynamic and cannot be expressed cleanly through the existing styling system.

Maintain consistency with existing design tokens.

---

# 13. Design System

Treat the existing design system as the source of truth.

Reuse existing:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Components
- Tokens
- Interaction patterns

Do not introduce arbitrary visual values when an existing token already represents the same concept.

Do not repeatedly hardcode brand colors inside components.

---

# 13.1 Data Tables, Detail Sheets & Side Modal Operations

When building data grids and management interfaces:

### Unified Table Architecture
- Tables must occupy the remaining vertical height of the screen after the header and filter bar (`flex-1 flex flex-col min-h-0 h-full`).
- Retain a defensive minimum height (e.g. `min-h-[380px]`) so tables do not collapse unexpectedly.
- The page itself does not scroll for table rows. Only the internal table body rows scroll vertically (`flex-1 min-h-0 overflow-auto`).
- The `<TableHeader>` must be sticky (`sticky top-0 z-10`).
- The pagination footer must be pinned at the bottom (`shrink-0 border-t`).
- Implement all 4 states: Loading skeleton, Empty state (with contextual create action), Error with Retry, and Forbidden (403).

### Entity Details in Side Drawer (`Sheet`)
- Clicking any table row opens quick details in an elegant Side Drawer (`Sheet` with `side="end"`).
- Action buttons inside table cells must use `e.stopPropagation()`.
- The side drawer provides a "Full View" link to `/resource/[id]` for direct navigation or bookmarks.

### Add & Edit via Side Drawer Modal (`Sheet`)
- Entity creation and edit operations MUST open directly in a side drawer modal (`Sheet` with `side="end"`), not navigate to standalone pages.
- Standalone `/new` and `/[id]/edit` pages are preserved strictly as fallback routes for direct URL visits and bookmarks.
- Form containers inside sheets wrap scrollable bodies (`<SheetBody>`) and pinned action footers (`<SheetFooter>`) with `<form onSubmit={handleSubmit(onSubmit)} className="contents">`.
- Mutations must invalidate server queries immediately for real-time table synchronization.

---

# 14. Responsive Design

Every UI implementation must consider:

- Mobile
- Tablet
- Desktop
- Large desktop

Responsive behavior must be intentional.

Check:

- Layout
- Typography
- Spacing
- Navigation
- Grids
- Images
- Overflow
- Touch targets
- Interactive elements
- Section heights

Avoid desktop-first layouts that become broken on smaller screens.

---

# 15. Internationalization

For projects requiring multiple languages, use `next-intl`.

Do not hardcode user-facing strings inside components.

Translation files should be organized clearly.

Use contextual translation keys.

Prefer:

```text
doctor.profile.title
doctor.profile.specialty
doctor.profile.bookAppointment
```

over:

```text
title
text
button
name
```

Do not implement translations through locale-specific conditionals such as:

```ts
locale === "ar" ? "..." : "..."
```

Use translation keys instead.

---

# 16. RTL / LTR

When Arabic or another RTL language is supported, the UI must support both:

- LTR
- RTL

Prefer logical CSS properties:

```text
ms
me
ps
pe
start
end
```

instead of unnecessary hardcoded left/right positioning.

Verify:

- Navigation
- Icons
- Arrows
- Forms
- Cards
- Spacing
- Alignment
- Grid/flex behavior
- Typography

Do not assume RTL works automatically.

---

# 17. Forms

Use:

- React Hook Form
- Zod

for non-trivial forms.

Forms should support appropriate:

- Validation
- Loading states
- Error states
- Success states
- Disabled states
- Accessible labels
- Keyboard interaction

Client-side validation is for user experience.

It is not a security boundary.

Server-side validation remains required.

---

# 18. API Architecture

A preferred architecture is:

```text
UI
 ↓
Feature Hook
 ↓
Feature API Layer
 ↓
Shared API Client
 ↓
Backend
```

Presentational components should not directly perform API requests.

Keep API communication separate from UI presentation.

Define explicit API types.

Transform backend responses at a clear boundary when necessary.

Do not spread backend-specific response handling throughout the UI.

---

# 19. API Client

Use a centralized API client when the project requires one.

For Axios-based projects, configure common concerns centrally where appropriate:

- Base URL
- Headers
- Authentication
- Error normalization
- Interceptors
- Timeouts

Do not duplicate API configuration across features.

Never expose secrets to the client.

---

# 20. Server State

Use TanStack Query when client-side server-state management is genuinely required.

Use it for situations such as:

- Client caching
- Refetching
- Mutations
- Optimistic updates
- Client-side synchronization

Do not use client state libraries to represent server state.

If Server Components can provide the required data without client-side synchronization, prefer the server approach.

---

# 21. Client State

Prefer local state.

Use global state only when there is a genuine cross-component requirement.

Do not introduce Zustand or another global state solution for:

- Simple modals
- Local filters
- Form state
- Temporary UI state
- One-component interactions

Use the simplest state mechanism that satisfies the requirement.

---

# 22. URL State

Use URL state when state should be:

- Shareable
- Bookmarkable
- Refresh-safe
- Navigable

For projects using `nuqs`, prefer it for appropriate URL query state.

Examples include:

- Search
- Filters
- Sorting
- Pagination
- Tabs when URL persistence is useful

Do not put every piece of UI state into the URL.

---

# 23. Mock Data

Mocks should resemble realistic backend structures.

Feature-specific mocks should remain inside the feature.

Global mocks may be placed under:

```text
src/mocks/
```

Do not create mock structures that are fundamentally different from the expected backend response.

---

# 24. API Integration Invariance

When integrating an API into an existing UI:

Do not redesign the UI.

Preserve:

- Layout
- Colors
- Typography
- Spacing
- Component hierarchy
- Animation
- Responsive behavior
- Visual identity

API integration should primarily change:

```text
Data Source
```

not:

```text
Design
```

Only make UI changes when dynamic data genuinely requires them.

Examples:

- Variable text length
- Missing media
- Empty arrays
- Loading states
- Error states
- Dynamic content wrapping

---

# 25. Loading / Error / Empty States

Dynamic features should consider:

```text
Loading
Success
Empty
Error
```

Implement only the states that are relevant to the feature.

Do not create unnecessarily complicated state systems for trivial UI.

States should be consistent with the existing design system.

---

# 26. SEO

Use Next.js native metadata capabilities.

When relevant, support:

- Title
- Description
- Canonical URL
- Open Graph
- Twitter metadata
- Structured data

Important projects should include appropriate:

- Sitemap
- Robots configuration

Use structured data where it provides meaningful semantic value.

SEO implementation should improve the user experience rather than merely manipulate search engines.

---

# 27. Accessibility

Use semantic HTML.

Ensure:

- Proper heading hierarchy
- Keyboard accessibility
- Visible focus states
- Accessible names
- Form labels
- Correct button/link semantics
- Sufficient contrast
- Meaningful alt text

Use ARIA only when necessary.

Prefer native HTML semantics over unnecessary ARIA.

Decorative images should use empty alt text.

---

# 28. Images

Use Next.js image capabilities appropriately.

Images should have:

- Appropriate dimensions
- Appropriate aspect ratio
- Responsive sizing
- Appropriate loading strategy
- Meaningful alt text

Critical above-the-fold images may use priority loading when justified.

Below-the-fold images should normally use lazy loading.

Do not blindly apply identical loading behavior to every image.

Prefer modern formats such as:

- WebP
- AVIF

when supported by the project.

Do not load unnecessarily large assets.

---

# 29. Media

For video and animation-heavy media:

- Avoid unnecessary autoplay
- Avoid unnecessary large downloads
- Use appropriate preload behavior
- Consider mobile performance
- Respect reduced-motion preferences when applicable

Media decisions should be based on actual UX requirements.

---

# 30. Animation

Use Framer Motion when meaningful motion improves:

- Feedback
- Hierarchy
- Navigation
- Transitions
- Storytelling

Avoid decorative animation that harms:

- Performance
- Accessibility
- Clarity

Respect:

```text
prefers-reduced-motion
```

Do not animate everything simply because the library exists.

---

# 31. Typography

Typography should be centralized.

Test supported languages independently.

Pay attention to:

- Line height
- Font rendering
- Heading wrapping
- Button dimensions
- Long content
- Arabic typography
- Mixed-language content

Do not assume an English layout will automatically work for Arabic.

---

# 32. Icons

Use Lucide React by default when the project uses it.

Do not introduce another icon library without a real requirement.

Do not use:

- Emoji as UI icons
- Random Unicode characters
- Text characters as visual icons

Icons should have a meaningful purpose.

Avoid generic decorative icons such as:

- Sparkles
- Stars
- Zap

when they do not communicate meaningful information.

---

# 33. TypeScript

Use strict TypeScript.

Avoid:

```ts
any
```

unless there is a justified reason.

Define explicit types for important:

- API responses
- Component props
- Forms
- Configuration
- Feature models
- Data transformations

Do not silence TypeScript errors simply to make the project compile.

Avoid unnecessary type assertions.

---

# 34. Naming

Use:

- PascalCase for components
- kebab-case for files where consistent with the project
- camelCase for variables/functions
- PascalCase for types/interfaces

Avoid vague names such as:

```text
Thing
Stuff
Helper
Manager
Data
Component
Utils
```

unless they genuinely describe the responsibility.

---

# 35. Imports

Use project path aliases.

Prefer:

```text
@/...
```

over unnecessary deep relative imports.

Avoid circular dependencies.

Maintain clear dependency direction.

---

# 36. Security

Never expose secrets to client-side code.

Never store private credentials inside:

- Components
- Client bundles
- Public configuration
- Git repositories

Do not use `NEXT_PUBLIC_` variables for secrets.

Avoid localStorage for sensitive authentication data unless explicitly required by the authentication architecture.

Validate and sanitize user input.

Never trust client-side validation for security.

---

# 37. Performance

Prefer:

- Server Components
- Minimal client JavaScript
- Optimized images
- Efficient data fetching
- Lazy loading where appropriate
- Stable component boundaries
- Reasonable bundle sizes

Avoid unnecessary:

- Re-renders
- API calls
- Dependencies
- Client state
- Large bundles
- Client-side rendering

Performance optimizations should be meaningful, not ritualistic.

---

# 38. Web Standards

Use semantic HTML and standards-based implementation.

Prefer:

- Real links
- Real buttons
- Native form controls
- Meaningful headings
- Accessible names
- Stable URLs

Do not build interactions that visually look like native controls while behaving differently.

---

# 39. Agentic Browsing

Websites should be understandable by automated and agentic systems.

Prefer:

- Semantic HTML
- Clear headings
- Meaningful links
- Stable URLs
- Accessible names
- Structured content
- Server-rendered important information
- Structured data where appropriate

Do not hide important information unnecessarily behind client-only behavior.

---

# 40. Design Exploration

When implementing a new major UI section with no predefined visual direction:

The AI agent should explore approximately five genuinely different design concepts.

Examples:

- Editorial
- Minimal
- Luxury
- Bento
- Asymmetric
- Split layout
- Image-led
- Card-driven
- Immersive

The five concepts are design exploration only.

The default implementation workflow is:

```text
Explore
 ↓
Compare
 ↓
Select strongest direction
 ↓
Implement one production solution
```

Do not automatically create five production components.

Multiple production variants should only be created when explicitly required.

---

# 41. Section Header Design

Section headers should remain intentional and clean.

Do not automatically add:

- Pills
- Badges
- Decorative icons
- Sparkles
- Stars
- Zap icons

A section header may simply contain:

```text
Heading
Optional supporting text
```

Additional elements should have a clear purpose.

---

# 42. Existing Design Preservation

When modifying existing functionality, preserve the existing design unless the task explicitly requests a redesign.

Do not use feature implementation as an excuse to change unrelated visual elements.

---

# 43. Refactoring

Do not perform unrelated refactoring during feature implementation.

If refactoring is required to correctly implement the requested functionality:

- Keep it minimal
- Keep it localized
- Preserve behavior
- Explain the reason

Do not rewrite working architecture merely because another approach appears more elegant.

---

# 44. Dependencies

Before adding a dependency:

1. Inspect existing dependencies.
2. Check native Next.js capabilities.
3. Check React capabilities.
4. Check existing utilities.
5. Consider whether a small local implementation is sufficient.

A dependency must solve a meaningful problem.

---

# 45. Browser Verification

Browser verification is valuable for visual tasks.

Use it when appropriate for:

- New page designs
- Major UI changes
- Responsive behavior
- Complex interactions
- Animation
- Visual regression

Do not make browser automation mandatory for every task.

Do not generate screenshots without a meaningful verification purpose.

---

# 46. Verification

Verify the relevant parts of the implementation.

Typical checks include:

```bash
pnpm tsc --noEmit
pnpm build
```

Also consider:

- Tests
- Linting
- Responsive behavior
- RTL/LTR
- Accessibility
- SEO
- API behavior
- Loading/error/empty states

Never claim that a verification step was performed if it was not.

---

# 47. Scope Control

Implement only what the task requires.

Do not unnecessarily modify:

- Unrelated components
- Routes
- APIs
- Configurations
- Dependencies
- Styles

The smallest correct change is preferred.

---

# 48. Rule Priority

When rules conflict, use:

1. Explicit user requirements
2. Security and correctness
3. Existing project architecture
4. Existing design system
5. Feature requirements
6. Accessibility
7. Performance
8. SEO
9. General project preferences

Never sacrifice correctness to preserve a lower-priority preference.

---

# 49. Final Principle

The AI agent should behave as a senior engineer working inside an existing Next.js codebase.

It should optimize for:

```text
User Intent
+
Correctness
+
Architecture
+
Maintainability
+
Performance
```

not:

```text
Maximum Code
+
Maximum Abstraction
+
Maximum Components
```

A small, correct, maintainable implementation is better than a large, impressive implementation.

---

# 50. Cloudflare Deployment Standard (OpenNext)

All modern Next.js projects in this ecosystem target **Cloudflare Workers** using `@opennextjs/cloudflare`.

### 50.1 Required Packages

- `@opennextjs/cloudflare` (dependencies)
- `wrangler` (devDependencies)

### 50.2 Required Configuration Files

1. **`open-next.config.ts`** (at root):
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

2. **`wrangler.jsonc`** (at root):
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "<project-name>",
  "main": ".open-next/worker.js",
  "compatibility_date": "YYYY-MM-DD",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "NEXT_PRIVATE_MINIMAL_MODE": "1"
  },
  "observability": {
    "logs": {
      "enabled": false,
      "invocation_logs": true
    }
  }
}
```

### 50.3 Standard `package.json` Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "cf:build": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

### 50.4 Git Hygiene

The following build outputs and runtime directories **MUST** be excluded in `.gitignore`:
```gitignore
# open-next & cloudflare
.open-next/
.wrangler/
```

Environment files (`.env*` except `!.env.example`) must never be committed to Git. Cloudflare environment variables and secrets must be configured via the Cloudflare Dashboard or Wrangler secrets.