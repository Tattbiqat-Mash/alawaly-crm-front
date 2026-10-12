# PROJECT CONTEXT

> Product identity, structure, content direction and visual identity for Alawaly.
> Engineering rules live in PROJECT_RULES.md / API_ARCHITECTURE.md; choices and doc gaps in /DECISIONS.md.
> Visual direction below is a **proposal** — confirm or replace with brand assets.

---

## 1. Project

- **Name:** Alawaly
- **Type:** Dashboard (staff) + Portal (owners)
- **Description:** Real-estate platform covering inventory, reservations, sales and payments, handover, ownership and warranty, after-sales service, facilities, rentals, reports and administration.
- **Main Goal:** Fast, simple, trustworthy daily operations for staff, and a calm self-service portal for owners.
- **Target Audience:** Alawaly staff (sales, finance, after-sales, facilities, admins) and property owners/customers.
- **Brand / Company:** Alawaly
- **Market / Country:** Saudi Arabia (SAR, Arabic first)

---

## 2. Project Sections

| Section | Purpose |
|---|---|
| Staff app (`/…`) | 42 screens S01–S42: inventory, sales, finance, handover, after-sales, facilities, rentals, data, administration |
| Owner portal (`/owner/…`) | 17 screens O01–O17: sign-in by phone code, units, reservations, payments, handover, warranties, requests, notifications, rentals |
| BFF (`/bff/…`) | Same-origin proxy to the REST API; holds sessions in httpOnly cookies |

---

## 3. Pages

Full screen map: wireframes artifact (S01–S42, O01–O17). Built so far:

| Page | Route | Purpose |
|---|---|---|
| S01 Staff sign in | `/login` | Email + password |
| S02 Dashboard | `/` | KPIs, status bars, "needs action", per-permission widgets |
| S03 Units | `/units` | Filterable, sortable, paged units with quick-view drawer |
| S04 Unit detail | `/units/[id]` | Details (optimistic locking), status change, price-change request, history, prices, ownership, eligibility, availability |
| O01 Owner sign in | `/owner/sign-in` | Mobile number |
| O02 Enter code | `/owner/verify` | 6-digit one-time code |
| O03 Owner home | `/owner` | Next installment, units, open requests, handover, notifications |
| O17 More | `/owner/more` | Language, appearance, sign out |

---

## 4. Core Features

- Permission-driven navigation and actions (35 permissions, `*` wildcard)
- Two-person rules shown honestly (price approval, offline payment confirmation)
- Optimistic locking with clear conflict handling
- Idempotent create actions (safe retries)
- Calm "not configured yet" states for undecided business policies
- Arabic/English with full RTL/LTR mirroring

---

## 5. Design Direction

### Overall Style

- [x] Modern
- [x] Minimal
- [x] Professional
- [x] Soft / Calm

### Design Description

Calm, professional and quick to scan. Deep teal on slate neutrals with a warm sand accent. Borders over shadows, generous whitespace in the owner portal, dense but readable tables in the staff app. Nothing decorative that doesn't carry information.

---

## 6. Brand Personality

- [x] Professional
- [x] Trustworthy
- [x] Calm
- [x] Modern

**Primary Personality:** Trustworthy + Professional + Calm

---

## 7. Visual Identity

### Colors (light / dark)

- **Primary:** `#0b6b61` / `#3cbfad`
- **Secondary:** `#eef2f2` / `#1c262a`
- **Accent (sand):** `#a87b3a` / `#d9b47a`
- **Background:** `#f6f7f8` / `#0c1214`
- **Surface:** `#ffffff` / `#131b1e`
- **Text:** `#0f172a` / `#e5ecee`
- **Muted Text:** `#556170` / `#9aa8ae`
- **Border:** `#e1e6e9` / `#253136`
- **Semantic:** success `#17703a`, warning `#8a5a00`, danger `#a3262a`, info `#1d5fa8` (lighter variants in dark mode). All text pairs meet WCAG AA.

Tokens live in `src/app/globals.css`; never hardcode colors in components.

### Visual Characteristics

- **Border Radius:** Medium (10px)
- **Shadows:** None / Soft (sign-in card only)
- **Gradients:** None
- **Borders:** Subtle

---

## 8. Typography

- **Primary Font:** IBM Plex Sans Arabic (Arabic UI)
- **Secondary Font:** IBM Plex Sans (English UI)
- **Arabic Font:** IBM Plex Sans Arabic
- **English Font:** IBM Plex Sans

### Typography Direction

- **Headings:** Semibold, compact
- **Body:** Regular, comfortable line height
- **Numbers:** Tabular figures, Western digits in both languages (amounts, ids, dates)
- **Overall Feel:** Modern, technical, legible

---

## 9. Theme

- **Theme:** Light + Dark
- **Default Theme:** System
- **Theme Switching:** Enabled

---

## 10. Languages & Direction

- **Languages:** Arabic, English
- **Default Language:** Arabic
- **Supported Directions:** RTL, LTR
- **Default Direction:** RTL

### Localization Notes

Arabic URLs have no prefix (`/units`); English uses `/en/units`. Logical CSS properties only; directional icons mirror. Bilingual API fields (`nameAr`/`nameEn`) follow the UI language.

---

## 11. Imagery & Visual Assets

- [x] Icons Only (for now)

### Icon Style

- [x] Outline (Lucide)

---

## 12. UI Personality

- **Buttons:** Rounded
- **Cards:** Border
- **Inputs:** Outlined
- **Navigation:** Sidebar (staff), bottom tabs (owner)
- **Overall Density:** Compact (staff, 1280px), Spacious (owner, 360px)

### UI Description

Every screen shows loading, empty, error, no-access, not-configured and conflict states. Tables fill the screen with a sticky header and pinned paging; rows open a quick-view drawer; create/edit happens in side drawers.

---

## 13. Motion & Interaction

- **Animation Level:** Subtle
- **Page Transitions:** None
- **Hover Effects:** Minimal
- **Micro-interactions:** Subtle

Respects `prefers-reduced-motion`.

---

## 14. Content Tone

**Content Tone:** Professional + Simple + Calm. Plain words for consequences ("Nothing changes until a different person approves").

---

## 15. Responsive Direction

- **Mobile:** Owner portal is mobile-first (360px); staff app collapses the sidebar into a drawer
- **Tablet:** Staff filters wrap; tables scroll internally
- **Desktop:** Staff app designed for 1280px+

**Responsive Strategy:** Mobile-first (owner), desktop-first with graceful collapse (staff)

---

## 16. Design Do / Don't

### Do

- Show only what the API returns; branch on error codes
- Disable unavailable actions and say why
- Keep amounts and dates in tabular Western digits

### Don't

- Present a requested change (price, payment) as done
- Show raw server messages
- Add decorative icons, pills or gradients without purpose

---

## 17. Special Requirements

- Two-person (four-eyes) rules for price changes and offline payment confirmations
- Handover acceptance only by the owner, in the owner portal
- Private files only through fresh signed links

---

## 18. Important Decisions

See `/DECISIONS.md`.
