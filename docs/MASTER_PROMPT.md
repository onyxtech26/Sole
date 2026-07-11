# Master Prompt — Sun Tours Reservation Dashboard

> Paste this at the start of any new session or subagent working on this project.
> It encodes ground truth, decisions already made, and the traps. Reading it should make
> re-deriving context unnecessary.
>
> Deep dives: [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) (why) · [`MASTER_PLAN.md`](./MASTER_PLAN.md) (how) · [`RESEARCH.md`](./RESEARCH.md) (evidence) · [`FAST_ENTRY.md`](./FAST_ENTRY.md) (Paste & Fill)

---

## Who and what

You are working on the **Sun Tours Travels reservation dashboard** — an internal back-office tool built by **Onyxx Tech** for a Rome tour operator running guided Colosseum tours.

- ~400–500 travellers/month · **3 staff** · ~90% of bookings arrive via **Viator** and are typed in by hand
- Replaces an Excel workbook. **Desktop-only** — the client explicitly waived mobile responsiveness
- App lives in `dashboard/`, **not** the repo root
- Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM · PGlite (Postgres) · jsPDF**
- Package manager: **pnpm**

---

## What we are actually building

**Not a reservation database. Something that runs their day.**

Their Excel is a workflow tracker that is failing. Booking data is pristine — 363 of 363 rows have a price. The columns that track *work done* are decaying: call sent 58.7%, confirmation 55.4%, ticket bought 52.3%, who-entered-it 4.1%. The **review-request column is at 0.0%** — one misspelled header cell, never used, across 363 travellers in a month.

They wrote the review template themselves. It says *"Every single review makes a big difference for our small local company."* It has never been sent, because sending it means leaving the spreadsheet, and then coming back to type `OK` in a cell.

They also **cannot compute their own profit**: cost is filled on 136 of 363 rows, so their implied 79% margin is fiction (~44% in reality).

> The product, in one sentence: **every morning it tells them who hasn't sent their names, whose tickets aren't bought, which group has no guide, and who needs a message today — and then sends the message.**

Design consequence: **doing the work must mark the work as done.** Never add a field whose only purpose is for a human to type `OK` into it. That is the failure mode we are fixing. See [`PRODUCT_VISION.md`](./PRODUCT_VISION.md).

Equally: this is a **three-person company**. Disproportionate engineering is a real failure mode. Best ≠ most. The vision doc carries a permanent non-goals list — honour it.

---

## The domain model — get this right or nothing works

Bookings arrive from Viator with a **booked time**. Staff then consolidate travellers **from different bookings** into **groups**. Each group has its own **actual departure time**, **entry/ticket time**, an assigned **guide**, and a **capacity** (7 or 24) set by the Viator *tour grade* (`TG1`/`TG2`/`TG3`, modelled as `product_options`).

**Grouping is at TRAVELLER level, not booking level.**

Verified in the client's own workbook (12 Jul 2026): one booking of 8 travellers was **split** — 6 into *Group 1* (entry 9:30, guide Felice), 2 into *Group 2* (entry 9:45, guide Carlo Maria). Group 2 simultaneously held travellers from **two other bookings** (3 + 2), totalling 7.

> A `bookings.groupId` foreign key is **wrong**. It is `travellers.groupId`.

Two distinct times exist and must never be conflated:
- **Booking Time** = the slot the customer bought → already stored as `bookings.startTime`. Do **not** add a `bookedTime` column.
- **Time** = the departure the group was consolidated into → `tour_groups.departureTime`.

The target PDF is a **hidden sheet** in their workbook called `Print 5 oct`:

```
GRP. | No | Type of tour | Date | Booking Time | Time | Incoming | Name | Last name | Type Age | Telephone | guide
```

`GRP.` and `guide` print once per group. `No` is a **continuous** counter across the whole day. Name and Last name are **separate columns**.

---

## Non-obvious facts that change design

1. **Colosseum tickets are nominative.** A government photo ID matching the ticket name is checked at the gate; names change only up to 7 days before. **EU citizens under 18 enter free; EU 18–24 pay €2 reduced**, and entitlement is verified at the gate.
   → `firstName`, `lastName`, `dateOfBirth`, `nationality` are **first-class fields driving entry eligibility and price tier**, not metadata. The client's WhatsApp template asking for ID-exact names and minors' DOB is entry law.

2. **Viator's Supplier API is push-only.** It calls *your* server; there is **no endpoint to list your own bookings**, and it mandates real-time availability endpoints + certification. The Partner API is for reselling *other people's* products.
   → Never propose "just pull bookings from the Viator API." It does not exist. The client independently **chose manual entry and rejected an OTA connection**, so this costs nothing. Speed comes from **Paste & Fill** — see [`FAST_ENTRY.md`](./FAST_ENTRY.md).

3. **The Viator booking page masks the phone** (`+1 ***-***-****`) until "Show" is clicked, and gives a **booking total**, not per-traveller amounts. Staff divide it by hand (`320.26 ÷ 2 = 160.13`, verified against their Excel). The parser must reject a masked phone; the app should do the division. `Product Code` (`5524558P4`) is the unambiguous join key — but Viator's product name and their operational name (`Private Colosseo`) differ, so products need both.

3. **Nobody in this market ships a drag-between-groups dispatch board.** Competitors ship read-only manifests + dropdown reassignment. This board is the differentiator.

4. **Capacity must warn, never block.** Staff routinely overfill a group and rebalance — their real data proves it. A hard block makes their process impossible to carry out.

---

## Decisions already made — do not re-litigate

| | |
|---|---|
| **Database** | **PGlite** (`@electric-sql/pglite` + `drizzle-orm/pglite`) persisting to `dashboard/tmp/pgdata/`, behind a `globalThis` singleton. Real `DATABASE_URL` → `postgres-js`. Supabase later = one env var, same migrations. |
| **Mock engine** | **Delete it.** It hard-codes 4 table names (`lib/db/index.ts:373`), one join (`:394`), two GROUP BY cases (`:419`), an absolute `C:\` path (`:30`). It cannot be extended. |
| **Grouping** | `travellers.groupId`, `onDelete: "set null"` — deleting a group returns customers to Unassigned, never deletes them. |
| **Capacity** | Warn, never block. |
| **Ordering** | Integer `sortOrder`, full reindex on drop (`index * 10`). No fractional indices. |
| **DnD** | `@dnd-kit/core` + `@dnd-kit/sortable`. **Not** `@dnd-kit/react` (pre-1.0 rewrite). |
| **PDF** | **One `autoTable` block per group**, never a monolithic rowSpan table. Keep jsPDF; add no deps. |
| **Guides** | Assignment only — the manifest needs a name per group. Payment/commission tracking is deferred, not gated. |
| **Scope now** | Grouping + grouped PDF. Product/sub-product CRUD **UI** deferred (the `product_options` **table** lands now — capacity reads from it). |

---

## Traps

1. **`app/api/bookings/[id]/route.ts:214-228` deletes and re-inserts every traveller on each edit.**
   Harmless today; the moment travellers carry `groupId`, **editing a booking's notes destroys that day's board.** Convert to a diff-based upsert **before** any grouping code lands. Non-negotiable.

2. **Deleting the mock engine touches every route at once** — all of them import `db`. Do it in isolation and verify `/`, `/reservations`, `/products`, `/reports` and booking create/edit/archive *before* writing new code.

3. **dnd-kit, all documented:**
   - `closestCorners`, not `closestCenter` (the latter resolves to the column, not the items inside). Better: `pointerWithin` → fall back to `rectIntersection`; the fallback is **required** for the keyboard sensor.
   - Functional `setState` updaters in `onDragOver`, or stale closures freeze state after a cross-container drag ([#386](https://github.com/clauderic/dnd-kit/issues/386)).
   - Guard the move — only update when the target container changes, or "too many re-renders" ([#1421](https://github.com/clauderic/dnd-kit/issues/1421)).
   - **Memoise the `SortableContext` id array**; a fresh `.map()` each render breaks the index cache and items jump ([#104](https://github.com/clauderic/dnd-kit/issues/104)).
   - Keep `DragOverlay` **mounted**. Prefix ids `grp-` / `trv-`.

4. **rowSpan is a trap in every PDF library.** `@react-pdf/renderer` has none ([#3002](https://github.com/diegomura/react-pdf/issues/3002)); `pdfmake`'s breaks across page boundaries ([#2274](https://github.com/bpampuch/pdfmake/issues/2274)). The continuous `No` counter is just an integer held across calls — it never required a single table.

5. **PGlite is single-process.** Fine for a prototype. Never let it be demoed as multi-user.

6. **`localeCompare` on possibly-undefined values already crashed the reports page once** (commit `d0e6e39`). Sorting needs fallbacks.

---

## Conventions — match the codebase

- **Styling is hand-written plain CSS in `app/globals.css`** (`.panel`, `.topbar`, `.content-stack`, `.form-grid`, `.product-grid`). Tailwind v4 is installed but **the UI does not use utility classes.** No component library. Do not introduce either.
- **Strict monochrome** black / grey / white. Status must be **redundantly coded** — word + weight + border + icon, never colour alone (`7 / 7 FULL`, `8 / 7 OVER ⚠`).
- **Density:** 32–36px traveller rows · **tabular numerals** for `6 / 7`, times, refs · hairline dividers, **no zebra striping** · drag-handle hit target ≥24×24px.
- **API routes:** `getSession()` → 401 guard, `try/catch` → 500, `NextResponse.json`. Follow the existing shape exactly.
- Prefer Drizzle's `inArray()` over the `sql\`IN ${ids}\`` pattern used in older routes.
- Money is **integer cents** end to end. Use `formatMoney` / `centsToDecimal` / `decimalToCents` from `lib/types.ts`. Dates use `todayRome()` (Europe/Rome).

---

## How to work

- **Read `MASTER_PLAN.md` before starting.** It has the build order and the verification steps.
- Build in the stated order. Step 1 (PGlite) and step 2 (traveller-wipe fix) gate everything else.
- **Verify by driving the app**, not by typechecking. `pnpm dev`, open the board, drag something, reload, regenerate the PDF, diff it against the `Print 5 oct` sheet.
- The PDF is **generated from the board, never re-typed.** Time/date drift between the system and the paper a guide carries is a documented trust failure in this market.
- Report honestly. If a step is skipped or a test fails, say so with the output.

---

## Definition of done (this iteration)

1. Staff drag travellers into groups on a daily board; assignments persist across reload.
2. The PDF reproduces the `Print 5 oct` layout, generated from the board.
3. Editing a booking no longer destroys the day's grouping.
