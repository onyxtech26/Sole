# Master Plan — Sun Tours Reservation Dashboard

**Client:** Sun Tours Travels (Rome) · **Vendor:** Onyxx Tech
**Status:** prototype built; this plan covers the grouping + manifest iteration and the road to production.
**Companion docs:** [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) (**why** — read first) · [`RESEARCH.md`](./RESEARCH.md) (evidence) · [`FAST_ENTRY.md`](./FAST_ENTRY.md) (Paste & Fill) · [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) (agent brief)

> **Scope note.** This document plans **one iteration** — the schedule board and the grouped manifest. It is not the product. The product is defined in [`PRODUCT_VISION.md`](./PRODUCT_VISION.md): the WhatsApp composer, the booking pipeline, and the Colosseum deadline radar are **core pillars, not upsells**. §12 sequences them.

---

## 1. Context

Sun Tours runs guided Colosseum tours in Rome. ~400–500 travellers/month, 3 staff, ~90% of bookings arrive via Viator and are typed by hand into an Excel workbook.

The prototype (`dashboard/`) replaced Excel for **recording** bookings. It did not replace it for **operating** them. After reviewing the prototype the client sent new requirements; reverse-engineering their real workbook — including a **hidden sheet, `Print 5 oct`, which is the sheet they hand to guides** — revealed the model the prototype is missing:

> Bookings arrive with a **booked time**. Staff then consolidate travellers *from different bookings* into **groups**, each with its own **actual departure time**, **entry/ticket time**, **guide**, and a **capacity** set by the Viator tour grade (7 or 24).

**Grouping is at traveller level.** On 12 Jul, one 8-person booking was split 6/2 across two groups with two different guides, while the receiving group simultaneously held travellers from two other bookings. A `bookings.groupId` FK would be wrong.

The client called this *"a very important functionality"* and requires the same structure in the PDF export, plus drag-and-drop reordering.

### Definition of done for this iteration

1. Staff drag travellers into groups on a daily board; assignments persist.
2. The PDF reproduces the `Print 5 oct` layout.
3. Editing a booking no longer destroys the day's grouping.

### Explicitly deferred
Product/sub-product CRUD **UI** (the `product_options` table lands now — group capacity reads from it). Guide payment tracking. Per-traveller pricing **entry** UI (columns land, default 0).

---

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **PGlite** now, Supabase later | Client asked for a dummy DB. The existing mock engine *cannot* be extended (§3). PGlite = real Postgres, in-process, no server, no credentials. `drizzle-orm/pglite` already ships in the installed drizzle 0.45.2. Going live = one env var. |
| D2 | **Traveller-level grouping** (`travellers.groupId`) | Proven by the 12 Jul split. |
| D3 | **Capacity warns, never blocks** | Their real workflow depends on overfilling then rebalancing. Corroborated independently by UX research and by their own data. |
| D4 | **Per-group PDF table blocks**, not one rowSpan table | Every library has a documented rowSpan × page-break bug. The continuous `No` counter is just an integer held across calls — it never required a single table. Zero new deps. |
| D5 | **Guide assignment only** | The manifest needs a guide *name* per group; nothing more. Payment/commission tracking needs a rollup period and a rate model — real work, no bearing on this iteration's definition of done. Defer, don't gate. |
| D6 | **Reuse `bookings.startTime` as Booking Time** | It already means exactly that. A second `bookedTime` column is a dual-write bug farm. |
| D7 | **Integer `sortOrder`, reindex on drop** | ~21 travellers/day. Fractional indices are unnecessary complexity. |
| D8 | **`@dnd-kit/core` + `@dnd-kit/sortable`** | Stable line. `@dnd-kit/react` is a pre-1.0 rewrite — not for a client deliverable. |
| D9 | **CSV importer, not API integration**, when automating intake | Viator's Supplier API is push-only and cannot list your bookings. The Extranet CSV export can. |

---

## 3. Step 1 — Replace the mock DB with PGlite

`lib/db/index.ts` proxies Drizzle into a hand-rolled SQL parser over a JSON file. It **cannot** support this work:

- hard-codes the four table names — `index.ts:373`
- supports exactly one join, `bookings→products` — `index.ts:394`
- supports two `GROUP BY` cases — `index.ts:419-429`
- hard-codes an absolute `C:\` path — `index.ts:30`
- its expression evaluator literally takes a `travellersForBooking` argument

```bash
pnpm add @electric-sql/pglite
```

- Rewrite `lib/db/index.ts` as a `globalThis` singleton PGlite client persisting to `dashboard/tmp/pgdata/`. **The singleton is required** — Next dev hot-reload otherwise opens several instances against the same directory.
- Delete `isFallbackNeeded`, `DB_PATH`, `initializeMockDb`, `executeMockSql`, `wrapQueryBuilder`, and `tmp/db.json`. Drop the `isFallbackNeeded()` branch from `lib/db/migrate.ts`.
- Keep the `postgres-js` path behind one branch: real `DATABASE_URL` → `drizzle-orm/postgres-js`; else PGlite. **Same schema, same migrations, same queries.**
- **Verify every existing page before writing any new code.** All routes import `db`; this change touches all of them at once.

> PGlite is single-process — correct for a prototype, and exactly what "dummy database for now" means. It is *not* the multi-user online access the meeting notes require. That arrives with the Supabase flip.

---

## 4. Step 2 — Fix the traveller-wipe (blocking)

`app/api/bookings/[id]/route.ts:214-228` deletes **all** of a booking's travellers and re-inserts them on every edit:

```ts
if (body.travellers) {
  await db.delete(travellers).where(eq(travellers.bookingId, bookingId));
  await db.insert(travellers).values(travellerValues);
}
```

Harmless today. The moment travellers carry `groupId`, **editing a booking's notes silently destroys that day's board.**

Convert to a diff-based upsert: match by `traveller.id`, update in place, insert new rows, delete only removed ones. **This must land before any grouping code.**

---

## 5. Step 3 — Schema

### New tables

- **`guides`** — id, name, active, createdAt
- **`product_options`** — id, productId (cascade), `code` (TG1/TG2/TG3), name, **`capacity`** (default 7), sortOrder, active; unique `(productId, code)`
- **`tour_groups`** — id, serviceDate, productId, productOptionId, guideId, `departureTime`, `ticketTime`, `capacity` (nullable → inherit), `ticketStatus` (`"Ticket done 9:45"`), sortOrder, notes, `version`, timestamps; index on serviceDate
- **`audit_log`** — entity, entityId, action, changedBy, at, `diff jsonb` (append-only)

### Alterations

**`travellers`** gains:
- `groupId` → `tour_groups`, **`onDelete: "set null"`** — deleting a group returns real customers to Unassigned, never deletes them
- `sortOrder`
- `firstName`, `lastName` — the print sheet splits them
- **`dateOfBirth`, `nationality`** — see below
- `grossCents`, `costCents` — Adult 63.19 vs Child 35.13; margin = gross − cost
- index on `groupId`

**`bookings`** gains `productOptionId`, `version`.

> ### Why `dateOfBirth` and `nationality` are load-bearing
> **Colosseum tickets are nominative.** Full name must match the photo ID checked at the gate; names are changeable only up to 7 days before. **EU citizens under 18 enter free; EU 18–24 pay €2 reduced** — and the entitlement is verified at the gate. ([colosseo.it](https://colosseo.it/en/opening-times-and-tickets/))
>
> The client's WhatsApp template asking for ID-exact names and minors' DOB is **entry law, not busywork.** These fields drive eligibility *and* price tier.

### Backfill

`drizzle-kit` does not emit data migrations. Hand-append:

```sql
UPDATE travellers SET
  first_name = CASE WHEN position(' ' in name) > 0
                    THEN left(name, position(' ' in name)-1) ELSE name END,
  last_name  = CASE WHEN position(' ' in name) > 0
                    THEN substring(name from position(' ' in name)+1) ELSE '' END
WHERE first_name = '' AND last_name = '';
```

Keep `travellers.name` populated for one release (write both from the form) so rollback is safe. Drop it next iteration.

### Seed

Real tour grades and capacities. Real guide names from the sheet: Felice, Carlo Maria, Susanna, Orietta, Liliana, Elizabetta, Giovanni, Rossella, Antonello, Maria Teresa.

---

## 6. Step 4 — The schedule board

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```
app/(dashboard)/schedule/page.tsx
components/schedule/schedule-board.tsx      // DndContext, optimistic state
components/schedule/unassigned-column.tsx   // droppable, groupId = null
components/schedule/group-column.tsx        // sortable column + droppable body
components/schedule/group-editor.tsx        // time, ticketTime, guide, capacity, status
components/schedule/traveller-card.tsx      // useSortable item
lib/schedule/auto-group.ts                  // pure, unit-testable
lib/schedule/types.ts
```

### Layout

Pinned **Unassigned** left rail (with a search box — 200 travellers is a lot to scan) + a horizontally-scrolling strip of capacity-badged group cards, ordered by departure time. **Not** a gantt: a timeline optimises for *when*; the job here is *who is in which bucket*.

```
┌────────────────┬──────────────────────────────────────────────────┐
│ ◀ Fri 10 Jul ▶ │  [+ New group]                 [Print manifest]  │
├────────────────┼──────────────────────────────────────────────────┤
│ UNASSIGNED  23 │ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│ [search…]      │ │Colosseo guide│ │Colosseo guide│ │Semi-Private│ │
│ ┌────────────┐ │ │09:00 ent 9:30│ │09:00 ent 9:45│ │10:00 ent…  │ │
│ │⠿ Rossi (4) │ │ │Guide: Felice │ │Guide: —    ⚠ │ │Guide: Orie…│ │
│ │  VT-1183   │ │ │  6 / 7       │ │  7 / 7  FULL │ │ 8 / 7 OVER⚠│ │
│ ├────────────┤ │ ├──────────────┤ ├──────────────┤ ├────────────┤ │
│ │⠿ Khan  (2) │ │ │⠿ Fairbank  (6) │ │⠿ Fairbank ½(2)⋯│ │⠿ Hensley(6)│ │
│ └────────────┘ │ └──────────────┘ └──────────────┘ └────────────┘ │
└────────────────┴──────────────────────────────────────────────────┘
```

### Interaction — build, in order

1. Drag handle `⠿` + whole-row drag; grab/grabbing cursor
2. `used / capacity` badge on every group header
3. **Over-capacity: allow the drop, flag it.** `8 / 7 OVER ⚠`, heavy border
4. `DragOverlay` showing the dragged chip (keep it **mounted**)
5. Multi-select → drag a set (staff move whole families)
6. **Split indicator** — `Fairbank ½ · 2 of 8 here`. The most error-prone state; make it unmissable
7. Insertion placeholder
8. Keyboard sensor (dnd-kit ships one) or a "Move to group…" menu

**Skip:** timeline view, animations, inline field editing on the board, touch tuning (desktop-only).

### Monochrome status must be redundantly coded

No colour available — encode with **word + weight + border + icon**:

| State | Encoding |
|---|---|
| Under capacity | `6 / 7`, normal border |
| Full | `7 / 7 FULL`, bold, filled header bar |
| **Over** | `8 / 7 OVER ⚠`, thick border, hatch fill |
| No guide | `Guide: —` + ⚠, hollow header |
| Split booking | `½` glyph + `2 of 8 here` |

**Density:** 32–36px traveller rows · tabular numerals for `6 / 7`, times, refs · hairline dividers, **no** zebra striping (hover + selected + drag already spend the grey budget) · drag-handle hit target ≥24×24px.

Styling goes in `app/globals.css` alongside the existing `.panel` / `.topbar` / `.content-stack` classes. **No Tailwind utility soup, no component library.**

### dnd-kit pitfalls — all documented, all avoidable

1. **`closestCorners`**, not `closestCenter` (which resolves to the column, not the items). Better: compose `pointerWithin` → fall back to `rectIntersection`; **the fallback is required** because `pointerWithin` doesn't work for the keyboard sensor.
2. **Functional `setState` updaters in `onDragOver`** — stale closures otherwise freeze state after a cross-container drag ([#386](https://github.com/clauderic/dnd-kit/issues/386)).
3. **Guard the move** — only update when the target container actually changes, or you get "too many re-renders" ([#1421](https://github.com/clauderic/dnd-kit/issues/1421)).
4. **Memoise the `SortableContext` id array.** A fresh `items.map(i => i.id)` each render breaks the index cache and items jump ([#104](https://github.com/clauderic/dnd-kit/issues/104)). Use `arrayMove` in `onDragEnd`.
5. **Keep `DragOverlay` mounted.**
6. **Prefix ids** — `grp-<id>` / `trv-<id>` — to tell a group drag from a traveller drag.
7. **No virtualization** at this scale.

### API

```
GET    /api/schedule?date=YYYY-MM-DD
POST   /api/schedule/reorder
POST   /api/schedule/auto-group?date=
POST   /api/schedule/groups
PATCH  /api/schedule/groups/[id]
DELETE /api/schedule/groups/[id]        // txn: travellers.groupId = null, then delete
GET    /api/guides
```

All follow the existing shape: `getSession()` → 401, try/catch → 500, `NextResponse.json`.

```ts
// POST /api/schedule/reorder — only changed containers
{ serviceDate, containers: { groupId: number | null, travellerIds: number[] }[], groupOrder?: number[] }
→ 200 { warnings: { groupId, count, capacity }[] }
```

One `db.transaction`. Optimistic UI: mutate local state on drop, fire the request, roll back to the pre-drag snapshot on failure and toast via `components/toast.tsx`.

**Board load = 2 queries.** Groups (join `products`, left-join `product_options` + `guides`, `COALESCE(tour_groups.capacity, product_options.capacity, 7)` as effective capacity, order by `sortOrder`) and all travellers for the date (inner-join `bookings`, `isNull(bookings.archivedAt)`, order by `sortOrder`); bucket `groupId === null` into Unassigned server-side. Prefer `inArray()` over the `sql\`IN ${ids}\`` pattern used elsewhere.

### Concurrency

Two staff on the same day is the realistic risk. Per-row **optimistic locking** (`version` column; `UPDATE … WHERE id = ? AND version = ?`; 0 rows ⇒ reload). Last-write-wins is not acceptable — it silently discards a colleague's reassignment.

The capacity race is **separate** and not caught by optimistic locking: do the capacity check + assignment in one transaction with `SELECT … FOR UPDATE` on the target group row.

Add `{ label: "Schedule", href: "/schedule" }` to `navItems` in `components/sidebar.tsx`.

---

## 7. Step 5 — Auto-group

`lib/schedule/auto-group.ts`, pure and unit-testable, operating on **unassigned travellers only** (idempotent — never disturbs manual work). First-Fit-Decreasing that keeps parties together and splits only when forced:

1. Bucket by `(productId, productOptionId, language)`. Language is a **real constraint** — a guide runs a group in one language.
2. Group travellers into **parties** by `bookingId`; sort parties by size descending.
3. Place each party whole into the first group with room; else open a new one. If a party exceeds capacity, fill any partially-open group first, then spill — this reproduces the real 8 → 6 + 2 split.
4. Prefill `departureTime` = earliest booked time in the group; leave `guideId` null.

---

## 8. Step 6 — The grouped PDF

Rewrite `app/api/reports/pdf/route.ts`.

**One `autoTable` block per group**, under a bold header band. Not a monolithic rowSpan table — `@react-pdf/renderer` has no rowSpan ([#3002](https://github.com/diegomura/react-pdf/issues/3002)) and `pdfmake`'s breaks across page boundaries ([#2274](https://github.com/bpampuch/pdfmake/issues/2274)). jsPDF's is fragile too. The continuous `No` counter is **just an integer held across calls** — it never required one table.

Per group: header band (tour type, **departure + entry time in the largest type** — a guide checks the clock constantly, guide name, `GRP. n`, total pax), then its traveller table:

```
No | Booking Time | Name | Last name | Type Age | Telephone | ☐
```

- `Booking Time` = `booking.startTime.slice(0,5)`; the band carries the group's actual `Time`
- add a **check-in box** column — guides tick people off
- a split booking appears on each group's sheet with its **local** pax count and `part of VT-1183 · 2 of 8` so nobody double-counts
- `startY: previousFinalY + gap`; let autoTable page-break naturally
- trailing **UNASSIGNED** pseudo-group so nobody silently vanishes from the manifest
- `headStyles.fillColor: [38,38,38]` to match the monochrome theme

**Print legibility:** body ≥11pt, black on white, flush left. Strip all screen chrome — drag handles, capacity math, `FULL`/`OVER` (a printed sheet is post-decision), filters, hover states.

Then a management summary: groups, travellers (adult/child/infant), revenue `Σ grossCents`, cost `Σ costCents`, balance — via the existing `formatMoney` in `lib/types.ts`.

**The PDF is generated from the board, never re-typed.** Time/date mismatches between the system and the documents guides carry is a top competitor complaint and a direct trust failure.

---

## 9. Build order

1. PGlite cutover + delete mock engine — **verify existing pages before touching anything else**
2. Booking `PATCH` diff-upsert *(blocking)*
3. Schema + backfill + seed; extend `lib/types.ts`; `booking-form.tsx` → firstName/lastName/DOB
4. `GET /api/schedule` + read-only board
5. dnd-kit + `POST /api/schedule/reorder` + optimistic rollback
6. Group CRUD + editor + `GET /api/guides` + capacity warnings
7. `auto-group.ts` + endpoint + button
8. PDF rewrite
9. Sidebar nav

---

## 10. Verification

- **Cutover:** `pnpm db:generate && pnpm db:migrate && pnpm db:seed`; load `/`, `/reservations`, `/products`, `/reports`; create + edit + archive a booking. All must pass **before** step 3.
- **Backfill:** every existing traveller has a non-empty `first_name`; no NULL FKs.
- **Traveller-wipe fix:** assign a traveller to a group → edit that booking's notes → confirm `groupId` and `sortOrder` survive. *This is the regression that matters most.*
- **Drag:** move a traveller between groups, reload, assignment persisted. Kill the server mid-drag → UI rolls back, toast fires.
- **Capacity:** overfill a group → `8 / 7 OVER` renders, save still succeeds.
- **Concurrency:** two browsers, same day; A moves a traveller, B moves the same one → B is rejected with a reload prompt, not a silent overwrite.
- **Auto-group** on the 12 Jul fixture (one 8-pax booking, capacity 7) → a 7 + spill layout, parties kept together where they fit.
- **PDF:** `No` runs unbroken across a page break; each group's band prints once; split bookings show `2 of 8`; summary balance = Σgross − Σcost. Compare side-by-side against the `Print 5 oct` sheet.
- Drive the board end-to-end with `pnpm dev` — not just typecheck.

---

## 11. Risks

- **Mock-engine deletion touches every route at once.** Do step 1 in isolation.
- **The booking `PATCH` wipe is non-negotiable.** Skipping it means every booking edit destroys the day's grouping.
- `tour_groups` has no DB constraint that its travellers' bookings share its product/grade. Enforce in the API this iteration.
- PGlite is single-process. Do not let the client demo it as multi-user.

---

## 12. Roadmap beyond this iteration

Sequenced from [`PRODUCT_VISION.md`](./PRODUCT_VISION.md). These are **product pillars, not paid add-ons.** Their Excel proves why: the columns that track *work* are decaying (call sent 58.7%, confirmation 55.4%, ticket bought 52.3%, who-entered 4.1%) and the review-request column is at **0.0%** across 363 travellers.

**Next — the part that changes their week**
1. **Booking pipeline stages**, replacing the free-text `OK` columns: `greeted → names collected → confirmed → ticketed → grouped → coordinated → completed → review requested`, each with a timestamp and an actor.
2. **WhatsApp composer** — their own 5 templates × 3 languages (EN/ES/IT) from the `Sending Message` sheet, with `{name}` / `{time}` / `{meeting_point}` interpolation, opened via `https://wa.me/<phone>?text=…`. **Sending marks the stage done.** This is the keystone: it stops the decay in all five columns at once, and it makes the review request — currently never sent — a single click.
3. **Colosseum deadline radar.** Timed tickets sell from **T-30**; names lock at **T-7**. Miss it and a traveller is refused at the gate. Fully derivable from data the system already holds.

**Then — the part that pays for itself**
4. **Paste & Fill** — see [`FAST_ENTRY.md`](./FAST_ENTRY.md). One paste of the Viator booking page replaces ~25 typed fields; the app does the `total ÷ pax` division staff do on a calculator. The parser must reject the masked phone.
5. **Per-product cost defaults → real margin.** Cost is recorded on only 37% of rows today, so their implied 79% margin is fiction (~44% once the gap is filled). Make cost a product default and it becomes 100% by construction.
6. **Audit log + optimistic locking** — `who` and `when` on every mutation, automatic.

**Later, only if asked:** product / sub-product (TG1–TG3) CRUD UI with drag-reorder · Supabase cutover for genuine multi-user access · Extranet CSV bulk import (still manual: a human exports and uploads) · waitlist + no-show as booking states · guide payroll rollups.

**Do not build, permanently:** Viator Supplier or Partner API integration · email-HTML parsing · a native mobile guide app · realtime/CRDT collaboration · an auto-*deciding* grouping optimiser (suggest, never decide) · channel-manager / booking-widget features · multi-currency.
