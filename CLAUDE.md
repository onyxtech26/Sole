# Sole — Sun Tours Reservation Dashboard

> **Naming.** The system is called **Sole** — a deliberate placeholder, pending the client's preference. The **client** is Sun Tours Travels; that name is correct wherever it appears and should not be changed. Don't spend effort on the name: this is an internal tool for three staff, so there is no trademark, domain, or SEO concern. If the client asks for something else, the rename is mechanical — every occurrence is listed under *Renaming* below.

Internal back-office tool for a Rome tour operator (Sun Tours Travels), built by Onyxx Tech.
~400–500 travellers/month · 3 staff · ~90% of bookings arrive via Viator and are typed in by hand.

**The app lives in `dashboard/`, not the repo root.** Next.js 16 App Router · React 19 · TypeScript · Drizzle ORM · PGlite · jsPDF. Package manager: **pnpm**. Desktop-only — the client explicitly waived mobile responsiveness.

## Read these first

| Doc | What it is |
|---|---|
| [`client/REQUIREMENTS.md`](client/REQUIREMENTS.md) | **What the client actually asked for.** Every requirement has an ID, a source, and a status: 🟢 confirmed · 🟡 derived by us · 🔴 open. Cite REQ-IDs in code and docs. |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | **Start here if you're new.** Setup, reading order, the two blocking fixes, open questions. |
| [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md) | Ground truth, decisions already made, and the traps. |
| [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) | What we're actually building and why: the tracking columns are decaying, the review step has never run, margin is uncomputable. |
| [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) | Build order and verification steps for the current iteration. |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual + interaction spec: measured tokens, monochrome status vocabulary, board wireframe, print rules. |
| [`docs/FRONTEND_PROMPT.md`](docs/FRONTEND_PROMPT.md) | Self-contained prompt to build the schedule board UI. Paste into Claude, repo or no repo. |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Cited evidence: the client's workbook, Colosseum ticketing law, Viator API reality, dnd-kit and PDF library traps. |
| [`docs/FAST_ENTRY.md`](docs/FAST_ENTRY.md) | How manual booking entry gets fast: the Paste & Fill parser, the masked-phone trap, the `total ÷ pax` division staff do by hand. |

## The one thing to get right

**Grouping is at traveller level, not booking level.** Staff consolidate travellers *from different bookings* into tour groups, and a single booking gets *split across* groups. Verified in the client's own data: one 8-person booking went 6 → Group 1 (9:30, guide Felice), 2 → Group 2 (9:45, guide Carlo Maria), while Group 2 also held travellers from two other bookings.

A `bookings.groupId` foreign key is wrong. It is `travellers.groupId`.

## Traps

- **`app/api/bookings/[id]/route.ts` deletes and re-inserts every traveller on each edit.** Once travellers carry `groupId`, editing a booking's notes destroys that day's board. Fix before any grouping work.
- **`lib/db/index.ts` is a hand-rolled SQL parser over a JSON file.** It hard-codes four table names, one join, and an absolute `C:\` path. It cannot be extended — replace it with PGlite.
- **Capacity warns, never blocks.** Staff overfill groups and rebalance by design.
- **rowSpan breaks across page boundaries in every PDF library.** Use one table block per group.
- **Viator's Supplier API cannot list your own bookings.** It's push-only — and the client chose manual entry anyway. Speed comes from Paste & Fill, not integration.
- **The Viator booking page masks the phone number** until "Show" is clicked. Never store a masked phone.

## Conventions

- Styling is **hand-written plain CSS in `app/globals.css`**. Tailwind v4 is installed but the UI does not use utility classes. There is no component library. Don't add either.
- Strict monochrome. Status is coded with word + weight + border + icon, never colour: `7 / 7 FULL`, `8 / 7 OVER ⚠`.
- API routes: `getSession()` → 401 guard, `try/catch` → 500, `NextResponse.json`.
- Money is **integer cents** end to end (`formatMoney`, `centsToDecimal`, `decimalToCents` in `lib/types.ts`). Dates via `todayRome()` (Europe/Rome).
- Prefer Drizzle's `inArray()` over the `sql\`IN ${ids}\`` pattern in older routes.

## Specialist agents

`db-architect` · `api-engineer` · `board-engineer` · `uiux-designer` · `pdf-engineer` · `domain-researcher` · `qa-verifier`

## Renaming

Every occurrence of the system name, should the client want a different one. Do it while the database is still empty — the cookie and the seed accounts are the two that hurt later.

| Where | What |
|---|---|
| `lib/auth.ts:5` | `sole-session` cookie — **changing this logs everyone out** |
| `lib/db/seed.ts`, `lib/db/index.ts` | `admin@sole.demo`, `ops@sole.demo` seed accounts |
| `app/login/page.tsx` | heading + the demo credentials shown on screen |
| `app/layout.tsx:5` | `<title>` |
| `components/sidebar.tsx:38` | sidebar wordmark |
| `app/api/reports/pdf/route.ts:84,150` | PDF header text and `sole-report-{date}.pdf` filename |
| `app/(dashboard)/reports/page.tsx:79` | on-page label |
| `dashboard/README.md`, `docs/*.md`, this file | prose |

`tmp/db.json` also contains the seed emails, but it is deleted in step 1 of the plan.

## Verification

Drive the running app — `pnpm dev` — and observe. A typecheck is not verification. The PDF is generated from the board and never re-typed; diff it against the hidden `Print 5 oct` sheet in the client's workbook, which is the spec.
