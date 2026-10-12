# Decisions

Choices made while building the Alawaly frontend, and places where the docs and the API disagree.
Rule of thumb from the brief: **the API wins**; record the gap here instead of guessing.

## Architecture

| # | Decision | Why |
|---|---|---|
| A1 | **Next.js 16 (App Router), not Vite.** | The brief says "unless the repo already has one"; the repo and `rules/` already use Next.js + shadcn/ui + next-intl + TanStack Query + nuqs + RHF/zod. |
| A2 | **One app** for staff (`/…`) and owners (`/owner/…`), sharing the UI kit and API layer. | The wireframe routes already separate them. Per-route code splitting keeps admin code out of owner pages. One build, one deploy; can be split later. |
| A3 | **Backend-for-frontend (BFF) with httpOnly cookies.** Browser → `/bff/staff/*` or `/bff/owner/*` → `${API_BASE_URL}/api/v2/*`. | Tokens never reach JavaScript, `localStorage`, URLs or logs. Two cookies (`alw_staff`, `alw_owner`) = two separate sessions. No CORS needed. |
| A4 | BFF forwards only `Accept-Language`, `Content-Type`, `Idempotency-Key`, `If-Match` up, and only `Content-Type`, `Content-Disposition`, `ETag`, `Idempotent-Replayed`, `Retry-After` down. | Smallest surface; nothing else leaks either way. |
| A5 | Cross-site writes to the BFF are refused (Origin/host check) on top of `SameSite=Lax`. | Cookie sessions need CSRF protection. |
| A6 | On upstream 401 the BFF clears that session's cookie; the browser does a **full** navigation to sign-in (`?next=` for staff). | A full navigation also drops every cached query of the ended session. |
| A7 | `[locale]` route segment with `localePrefix: "as-needed"`: Arabic (default) keeps the wireframe URLs (`/units`), English is `/en/units`. Locale is read with `next/root-params`. | Each locale gets its own prerendered pages. (Cache Components is off for now; see Environment.) |
| A8 | Session reads and URL-reading client components sit behind small `<Suspense>` boundaries. | Written for Cache Components, kept so it can be turned back on; they also let pages stream. |
| A9 | Mock mode (`API_MOCKS=1`) answers from the **recorded Frontend Guide examples** inside the BFF. Real API is the default. Tests can ask for a recorded status with `x-mock-status`. | The browser code path is identical in both modes; no MSW service worker needed. |
| A10 | `api-spec/guide-examples.json` (168 endpoints, 220 examples) is extracted from the Frontend Guide by `pnpm api:extract <guide.html>`. Types are written per feature from these recorded responses. | `openapi-v2.json` was not available locally. If it is added to `api-spec/`, generate types with openapi-typescript and cross-check. |
| A11 | No chart library on the dashboard: CSS bars. | Keeps the first load small; a chart library can be lazy-loaded later if needed. |
| A12 | Owner session has no `/me` in the API, so the BFF keeps `{id, name}` from the verify response in an httpOnly display cookie (greeting only, never used for authorization). | |
| A13 | The phone number between "send code" and "verify" lives in an httpOnly cookie (10 min); the page only sees a masked hint. | Keeps PII out of URLs and client storage. "Resend" reuses it. |
| A14 | Session cookies have no `maxAge` (browser-session lifetime). | The guide documents no token lifetime or refresh endpoint. Revisit when the backend states one. |

## Behaviour choices

| # | Decision |
|---|---|
| B1 | Unit edits send **only changed fields** with `If-Match` taken from the version the user started editing (not a newer one fetched in the background), so concurrent edits always surface as a conflict. |
| B2 | On conflict: "Reload latest" refetches, keeps the user's edits (`keepDirtyValues`) and lists the fields that changed underneath. |
| B3 | Editable unit fields follow wireframe S04 (type, rooms, bathrooms, area, construction status, display order, active, comments). Status and prices are read-only there and have their own actions. The API's exact whitelist is not documented: `FIELD_NOT_WRITABLE` is mapped back onto the offending field. |
| B4 | Status change: targets limited to available/unavailable/hidden. Leaving `sold` needs `inventory.status.override`, shows a destructive warning and **requires a reason**; otherwise the reason is optional (the API accepts it without one). |
| B5 | `If-Match` is also sent on `POST /units/{id}/status` (guide conventions), although the wireframe lists it only on PATCH. |
| B6 | Price changes are only ever shown as "sent for approval"; nothing updates locally. An `Idempotency-Key` is sent on every create-style POST (brief), even where the API does not require it. `new_value` is sent as a decimal string (the guide example sends a number). |
| B7 | After `VERSION_CONFLICT` or `IDEMPOTENCY_CONFLICT`, the idempotency key is renewed (it is a new intent). |
| B8 | Reads retry up to 2 times on network errors, 5xx and 429 (honouring `Retry-After`); mutations never auto-retry. 429 and offline show one global toast; everything else is shown where it happened. |
| B9 | Money math uses integer halalas (BigInt) and formatting uses the exact decimal string; **Western digits** in both languages (guide). Timestamps are shown as recorded (no zone shift). |
| B10 | Top-bar search searches **units only** (`GET /units?q=`): the API has no global search endpoint. |
| B11 | Screens not built yet are **hidden from the staff menu**. Owner bottom tabs for later screens stay visible but inert, marked "coming soon". Import units (S06) shows a disabled button with the reason. |
| B12 | Dashboard "payments waiting for a second approver" = `meta.total` of `GET /payment-transactions?filter[status]=pending_second_approval&pageSize=1` (needs `finance.view`). Each widget hides on 403. |
| B13 | Owner "open requests" counts statuses new, triaged, approved, assigned, scheduled, in_progress, reopened. |
| B14 | Eligibility (S04) is checked for the **current recorded owner** from the ownership history (the endpoint needs `client_id`). |
| B15 | Lookups for filters (projects, buildings, unit types) load one page of 100. Fine for the current data; add search-as-you-type selects if any list grows past 100. |
| B16a | First visit follows the browser language (next-intl detection, Arabic when no match); the AR | EN switch is remembered in a cookie. |
| B16 | Brand wordmark stays in Latin ("ALAWALY") in both languages until an official Arabic mark is supplied. |
| B17 | Phase B lists that open a full page (sales, handovers) navigate on row click instead of opening a drawer: their detail needs steps and tabs. Simple records (projects, buildings, unit types, policies, reservations, transactions) open in a side sheet. |
| B18 | **No client search API** exists, so reservations, sales and transfers ask for the client number (from the CRM). Revisit when a clients endpoint exists. |
| B19 | Reservation countdowns assume the server runs on Saudi time (UTC+3) because timestamps carry no zone (`SERVER_UTC_OFFSET_MINUTES` in lib/format/dates). Confirm on the live server. |
| B20 | "Record payment" on a reservation or installment calls `POST /payments/initiate` (offline). Money counts as paid only after `confirm-offline` + a second approver (S17). Online card payment is shown disabled: no gateway is chosen. |
| B21 | Installment waiving has no documented API, so the button is disabled with an explanation. |
| B22 | S17 "Recorded by me" is taken from the latest 100 offline transactions, filtered by `verified_by` in the browser: no `verified_by` filter is documented. |
| B23 | S18 refunds start from the list of paid transactions (the API refunds a transaction id); "already refunded" sums refunds whose reference is `refund-of-{id}` (recorded example). The server bounds the amount anyway (`REFUND_EXCEEDS_PAYMENT`). |
| B24 | S08 project status is free text with suggestions: the docs only show `ongoing`. Project search and city filters from the wireframe are omitted (no documented filter fields). |
| B25 | S10 lookup tabs use the types facade, finishing, view, parking (wireframe). Unknown types return an empty list. |
| B26 | S23 warranty policy category and duration are editable only on create; the wireframe locks the duration of existing policies. |
| B27 | S24 service desk sorts by `-priority` (default), `sla_due_at` or `-id`. Sorting by SLA is assumed allowed (not in the documented sort list); a 422 shows the normal error state. |
| B28 | S31–S35 a mandate in `full_management` mode is treated as holding every capability; `services_only` needs the capability listed. The server still decides (`MANDATE_SCOPE`), and the UI shows that refusal as a read-only banner. |
| B29 | S37 the permission checklist is built only from `GET /permissions` (unknown names are rejected). The `*` (full access) option appears only on roles that already hold it, since creating new `*` roles is not documented. |
| B30 | S37/S38 deactivating a role or user asks for confirmation but not a reason: `PATCH /roles/{id}` and `PATCH /users/{id}` take no reason field, and the audit log records the change. |
| B31 | S38 branch is a number field: no branches endpoint is documented. The user list shows role names only when the viewer also holds `admin.roles`; otherwise it shows the role number. |
| B32 | S36 a document opens through its own signed link: `sale:{docId}` with `owner_id` = sale id → `/sales/{owner_id}/documents/{docId}/link`; `service:{attId}` → `/service-attachments/{attId}/link`. Other sources show no open action. |
| B33 | O06 is reached from a link (`/owner/reserve/{unitId}`): the API has no owner catalogue. Availability is checked first; one Idempotency-Key per visit. |
| B34 | O08: the owner can start a payment only for a reservation fee (`POST /owner/payments/initiate` takes `reservation_id`), as `offline` until a gateway is chosen. The installment page shows the server-verified state (polled every 30 s until paid), offline instructions, and a disabled card button. |
| B35 | O12: paid and facility requests need `eligibility.after_sales`; warranty claims need `eligibility.warranty` and go to `/owner/warranty-claims` (no priority). The photo uploads after the request exists; if it fails, the request stays and the owner can add the photo from O14. |
| B36 | O13 chips: Open = the open service statuses; Completed = completed, closed, rejected. |
| B37 | O15: a tap marks the notification read; `service.*` with `service_id` opens that request, `warranty.*` opens warranties, others only mark read. |
| B38 | O16: statements load when the mandate lists `view_statements` or is `full_management`; otherwise (or on `MANDATE_SCOPE`) a short explanation shows. |
| B39 | O07 cancel and O10 accept ask for confirmation without a reason: both endpoints take no body and the owner is acting on their own record. |
| B40 | S03 site plan (`?view=plan`) draws each building as a front elevation. It reads **every** unit of the chosen project (pages of 100, at most 20 pages; beyond that a notice asks to pick a building) and, when other filters are set, a second filtered list whose ids stay lit while the rest are dimmed, so the server still applies every filter. A unit's floor is `floor_num`; when that is empty (as in all recorded examples) it is read from "floor + two-digit door" numbers (`1205` → 12); anything else goes to a "floor not recorded" row. Buildings are topped up to `floors_count`. Confirm floor numbering with the backend. |

## Docs vs API (API wins)

| # | Where | Docs say | API / guide says | What we do |
|---|---|---|---|---|
| D1 | Brief §4 | `per_page` | `pageSize` (meta `{page, pageSize, total}`) | `pageSize` |
| D2 | Brief §4 | stale ETag → 412 | 409 `VERSION_CONFLICT` with `details.current_version` | Handle both |
| D3 | Reservations | — | Examples carry both `status: "reserved"` and `state: "pending"` | Use `state` |
| D4 | `GET /reports/sales-summary` | money is a string | `collected`, `refunded` are numbers | Money helpers accept both |
| D5 | Rental statements | money is a string | `totals` are numbers | Same as D4 (later phase) |
| D6 | `GET /owner/sales/{id}/installments` | lists have `meta` | no `meta` | Synthesize meta |
| D7 | Error messages | plain text | Some arrive HTML-escaped (`&#x27;`) | Never shown raw; codes map to our translations |
| D8 | Wireframes S16/S17/S15 | — | Example payloads do not match the screens (noted in the wireframes) | Follow the endpoint docs |
| D9 | S24 | page needs `service.view` | KPI strip uses `/reports/service-workload` (`maint.manage`) | Hide the strip on 403 |
| D10 | S12 | page needs `sales.reserve` | "Record payment" calls `/payments/initiate` (`sales.manage`) | Gate the shortcut separately |
| D11 | S17 | page needs `finance.confirm` | queue `GET /payment-transactions` needs `finance.view` | Gate the queue on `finance.view` |
| D12 | S18 | route `/payments/:id/refund` | refund is `POST /payment-transactions/{id}/refund`; nav "Refunds" has no id | Nav opens a list of refundable transactions |
| D13 | S32 / S35 | top-level nav items | need a mandate id | Add a mandate picker |
| D14 | O09 | route `/owner/sales/:id` | no `GET /owner/sales/{id}` | Derive from the list |
| D15 | O10 | route uses `saleId` | accept uses the handover id | Read handover by sale, accept by its id |
| D16 | S01 | — | Login can return `permissions: ["*"]` | `*` grants everything |
| D17 | `GET /sales/{id}/installments` | lists have paging meta | `meta` carries money totals `{total, paid}` (numbers) | Read them as totals, not paging |
| D18 | Duplicates (S07) | — | Only class `deferred` is documented | Other classes shown as-is; KPIs: deferred = needs a decision |
| D19 | Admin account `admin.dev@example.test` | — | Signs in but `permissions: []` (role 1) → every screen answers 403 | Backend: grant `*` to the role or run `php artisan v2:create-admin` |
| D20 | Recorded examples | lists | Long lists are shortened with a trailing "… N items in total" string (capabilities, permissions, roles) | Such strings are dropped when reading; real data has none |
| D21 | `GET /leases/{id}` | inspection `items` is a list | Returned as a JSON string | Parsed on read; sent as an array |
| D22 | `GET /audit-logs` | — | `before`/`after` are JSON strings, `entity_id` is a string | Parsed for display; unparsable values shown raw |
| D23 | `POST /external-refs` | not in the idempotency list | create-style request | Sends `Idempotency-Key` anyway (harmless if ignored) |
| D24 | O10 | — | `GET /owner/sales/{id}/handover` answers 404 both for "no handover yet" and for another owner's sale | Both read as "not scheduled yet" |
| D25 | O07 / O14 | `CANCEL_NEEDS_STAFF`, `FEEDBACK_ALREADY_GIVEN` | Not in the guide's error list | Handled on their screens; anything else shows the generic message |

## Environment

- Live API: `https://system.alawaly.tattbiqat.com/api/v2` (checked: unauthenticated `GET /me` → 401 `UNAUTHENTICATED`, wrong login → 401 `INVALID_CREDENTIALS`).
- `pnpm cf:build` (OpenNext for Cloudflare) fails on native Windows with "Access is denied" on pnpm's linked folders (worse inside OneDrive). Build in WSL or CI (Linux). `pnpm build` works on Windows. Outside OneDrive with `nodeLinker: hoisted` it builds on Windows too.
- Cloudflare (OpenNext 1.20.10, Next 16.4), two fixes, both needed or every page answers `error code: 1101`:
  - `patches/@opennextjs__cloudflare@1.20.10.patch` adds `preview-props.json` to the manifests OpenNext inlines. Next 16.4 reads it on startup; without it: `Unexpected loadManifest(/.next/server/preview-props.json) call!`. Drop the patch once an OpenNext release includes it (`pnpm` refuses a patch that no longer applies on upgrade).
  - `cacheComponents` and `partialPrefetching` are off. With them on, every page render hangs in workerd ("Worker's code had hung"): known upstream, fix pending in opennextjs-cloudflare#1318 (and Next 16.4 support in opennextjs-aws#1285). Side effect while off: the client router leaves one segment prefetch request open, so e2e tests must not wait for `networkidle` after navigating. Re-test with `pnpm cf:build` + `wrangler dev` (and `e2e/first-load.spec.ts`) before turning them back on.
- `wrangler.jsonc` sets `keep_names: false`. Otherwise esbuild adds `__name()` calls inside next-themes' inline script, which throws in the browser on every page and skips applying the saved theme before first paint.
