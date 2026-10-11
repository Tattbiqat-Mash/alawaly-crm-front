# Alawaly — staff app and owner portal

Next.js 16 (App Router, Cache Components) frontend for the Alawaly REST API (`/api/v2`).
Staff app at `/…`, owner portal at `/owner/…`. Arabic first (RTL), English at `/en/…`.

## Run

```bash
pnpm install
cp .env.example .env.local      # API_BASE_URL=https://system.alawaly.tattbiqat.com
pnpm dev                        # real API
pnpm dev:mock                   # recorded Frontend Guide examples, no backend needed
```

## Check

```bash
pnpm typecheck && pnpm lint && pnpm test   # types, lint, unit tests
pnpm build                                  # production build
pnpm exec playwright test                   # end-to-end (builds, then runs in mock mode)
```

`pnpm cf:build` / `pnpm deploy` (Cloudflare via OpenNext) — run in WSL or Linux CI; see DECISIONS.md.

## How it fits together

```
Browser ──► /bff/staff/*  ─┐  httpOnly cookie → Authorization: Bearer
        └─► /bff/owner/*  ─┴► ${API_BASE_URL}/api/v2/*      (src/app/bff, src/lib/bff)
UI → feature hook (TanStack Query) → feature api → shared client (src/lib/api)
```

- `src/features/<domain>` — api, hooks, types, components per business area
- `src/components/shared` — states (S41), data table, form kit, dialogs, file upload
- `src/lib/api` — error normalisation, envelopes, list params, idempotency, signed files
- `src/lib/format` — money (no floats), dates (no zone shift), bilingual fields
- `src/messages/{ar,en}.json` — all UI text (typed keys)
- `api-spec/` — 168 endpoints / 220 recorded examples extracted from the Frontend Guide (`pnpm api:extract <guide.html>`)

Decisions and doc/API mismatches: [DECISIONS.md](DECISIONS.md). Project rules: [rules/](rules/).
