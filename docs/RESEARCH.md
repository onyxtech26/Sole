# Research Findings — Sun Tours Reservation Dashboard

Compiled 10 Jul 2026. Sources cited inline. **Verified** = primary source. **Inference** = judgement, not fact.

---

## 1. Ground truth from the client's own workbook

Source: `July 2026.xlsx` (411 rows, sheet `July`) + a **hidden sheet, `Print 5 oct`**.

### The hidden sheet is the spec

`Print 5 oct` is the layout they actually hand to guides:

| GRP. | No | Type of tour | Date | Booking Time | Time | Incoming | Name | Last name | Type Age | Telephone | guide |

- `GRP.` printed **once per group**; so is `guide`
- `No` is a **continuous** traveller counter across the whole day (1..21+), not per group
- **`Booking Time` ≠ `Time`.** Booking Time is the slot the customer bought; Time is the departure the group was actually consolidated into
- `Name` / `Last name` are **separate columns** — the app currently stores one `name`
- one blank spacer row between groups

### Grouping is at traveller level, not booking level

**Verified on 12 Jul 2026** (rows 178–209). One booking of 8 travellers (rows 183–190, continuous `N0` 1..8, a single phone + language on the lead row) was **split**:

- 6 travellers → `Group 1 Ticket done 9:30` (guide *Felice*)
- 2 travellers → `Group 2 Ticket done 9:45` (guide *Carlo Maria*)

That same Group 2 simultaneously held travellers from **two other bookings** (3 pax + 2 pax) — total 7.

> A `bookings.groupId` foreign key would be **wrong**. The relationship is `travellers.groupId`.

### Column semantics (the `July` sheet)

| Col | Header | Reality |
|---|---|---|
| A | `N0` | Index within booking. **Unreliable** — rows 22/23 both say `5`; rows 62–66 run `1,2,1,2,1` |
| B | `Type of tour` | 7 distinct values (below) |
| E | `Language` | `EN` (95), `SP` (5), `PO` (2) — **lead row only** |
| F | `Name of Guide` | Always the literal `1`. Mislabelled; useless |
| G | `Name & Last Name` | Single column here, split in the print sheet |
| I | `Viator` | **Per-traveller** gross. Adult 63.19 / Child 35.13 — differs by age |
| J | `spent` | Per-traveller cost (~46.61) |
| K | `Balance` | `I − J`. Margin, per traveller |
| M, N | (`name`, `confirmation`) | Two independent `OK` flags. M is mislabelled |
| O | `Time cordination…` | `Ticket done 9:45`, `Group 2 Ticket done 9:45`, `Routas 8:40` |
| P | `description` | **The real guide name** lives here: `Felice`, `Carlo Maria`, `Susanna 6 clients`, `Orietta` |
| R | `sign up` | Staff who entered it: Neda, Aban, Masoud, Tina, Sina |

Tour types and observed party sizes:

| Tour type | Rows | Max party |
|---|---|---|
| Colosseo guide | 214 | 14 |
| Semi-Private Colosseo | 81 | 7 |
| Private Colosseo | 45 | 5 |
| Arena Ticket + Virtual Tour | 7 | 3 |
| Colosseo Ticket + Virtual Tour | 6 | 4 |
| Just Colosseo | 6 | 6 |
| Just Colosseo - Semi private | 4 | 4 |

**Rows are not sorted by date** (Wed 08 Jul appears before Mon 06 Jul). `N0` is wrong in places. This disorder *is the problem being solved*.

### A fifth sheet worth knowing about

`Sending Message` holds **5 WhatsApp templates × 3 languages** (English / Spanish / Italian): greeting, name collection, confirmation, time coordination (kiosk + Café Roma variants), review request. Column `O` of the `July` sheet tracks which were sent.

---

## 2. Colosseum ticketing — the highest-value finding

**Verified.** This is entry law, not preference, and it dictates the traveller schema.

- Tickets are **nominative**. Every visitor's full name is entered at booking, and a **government photo ID matching that name is checked at the gate**. Name changes allowed up to **7 days** before the visit. ([colosseo.it](https://colosseo.it/en/opening-times-and-tickets/), [Real Rome Tours](https://www.realrometours.com/new-rules-at-the-colosseum/))
- **Timed entry is compulsory**; inventory is genuinely limited. Tickets go on sale only **30 days before** the visit date. Free/reduced visitors still need a booked slot or they are refused. ([colosseo.it](https://colosseo.it/en/opening-times-and-tickets/))
- **Age + citizenship set the price tier**: EU citizens **under 18 = free** (still need a ticket + proof of EU citizenship); EU **18–24 = €2 reduced**; full price from the day they turn 25. Entitlement is checked at the gate. ([howdyeurope](https://howdyeurope.com/en/italy/rome/colosseum/tickets/discounts/))
- Context: in April 2025 Italy's antitrust authority fined CoopCulture and six operators ~€20M for ticket hoarding. Nominative ticketing is the enforcement response — operators genuinely cannot fudge names or quantities.

> **This validates the client's WhatsApp template** asking for names exactly as on ID and DOB for under-18s. `firstName`, `lastName`, `dateOfBirth`, and `nationality` (EU / non-EU) are first-class fields that drive both **entry eligibility** and **price tier** — not optional metadata.

---

## 3. Viator integration reality

**Verified.** There are two Viator APIs and **neither lets a small supplier pull their own bookings.**

- The **Supplier / Reservation-System API is push-only**. Viator calls *Create Booking* on **your** server. There is **no endpoint to list your own bookings**. You must also expose **mandatory real-time + batch availability endpoints**, and onboarding requires an assigned account manager, certification, and a pilot product. ([api-overview](https://docs.viator.com/supplier-api/technical/api-overview/), [connectivity-overview](https://docs.viator.com/supplier-api/technical/connectivity-overview/))
- The **Partner API** (affiliate / merchant tiers) is for **reselling other people's products**. Wrong tool entirely. ([partner-api](https://docs.viator.com/partner-api/))
- The **realistic channel**: the Viator **Management Center** (`supplier.viator.com`) has a Bookings tab with traveller-level detail and **CSV export**. ([Viator partner resources](https://partnerresources.viator.com/resources/reporting-on-your-performance/))

> **Consequence for the proposal.** The "paste-and-fill" feature sold in the *Recommended* package should be re-aimed at a **CSV importer** built on the Extranet export — stable, available today, no certification. Text/email parsing is a fragile fallback, not the primary path.

**Not verified:** exact Extranet CSV column schema (export one real file before building), and whether Viator's notification emails have any stable structure. Treat email as a "go look" trigger only.

---

## 4. Competitor operations lessons

From Capterra / G2 / Bókun comparison material on Rezdy, FareHarbor, Bókun, Ventrata:

- **Nobody in this space ships a true drag-between-groups dispatch board.** They ship read-only *manifests* plus dropdown/bulk-edit resource assignment. Ventrata is closest (manifests + bulk guide reassignment). **This is the gap Sun Tours is filling.**
- **Fees dominate complaints** — ~49% of FareHarbor negative reviews cite high, inflexible fees; 3–6% commission on top of subscription. An in-house tool avoids this entirely; worth stating to the client.
- **Time/date mismatches between the system and documents sent to travellers erode trust** (reported for Rezdy). → *The PDF must be generated from the board, never re-typed.*
- **Mobile manifest editing is a top complaint** (FareHarbor: text too large, blurry, multi-click). → Desktop-only admin + a clean printable PDF for guides sidesteps this. Do not build a guide mobile app.
- What drives retention, operations-side: printable manifests, capacity that cannot be silently exceeded, guide/resource allocation tied to capacity, one-action day-of reassignment.

---

## 5. Schedule-board UX

- The layout the industry converges on for this shape of problem is the **multi-column kanban / dispatch board**, not a gantt. A timeline optimises for *when*; the job here is *who is in which bucket*. dnd-kit ships this as its canonical **"Multiple Containers"** story. ([dnd-kit MultipleContainers](https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx))
- **Recommended layout:** pinned "Unassigned" left rail (with search — 200 travellers is a lot to scan) + a horizontally-scrolling strip of capacity-badged group cards, ordered by departure time.
- **Over-capacity: allow but flag.** Independently corroborated by the client's own data — staff routinely overfill and rebalance (Group 2 held 7 from three bookings). A hard block makes the real process impossible.
- **Split-booking indicator is the single most error-prone state** — mark each fragment (`part of VT-1183 · 4 of 6 here`).
- **Monochrome status must be redundantly coded** — word + weight + border + icon, never colour alone. This is how colour-degraded cockpit displays keep critical states findable. ([NASA cockpit display design](https://www.nasa.gov/human-systems-integration-division/cockpit-display-design-intelligent-spacecraft-interface-systems/))
- **Density:** 32–36px traveller rows; tabular/monospaced numerals for `6 / 7`, times and refs; hairline dividers, **not** zebra striping (too many greys already in play with hover/selected/drag states); drag-handle hit target ≥24×24px. ([Pencil & Paper: enterprise data tables](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables))

### dnd-kit pitfalls (all documented)

Use **`@dnd-kit/core` + `@dnd-kit/sortable`** (stable). `@dnd-kit/react` is a pre-1.0, non-backwards-compatible rewrite — do not bet a client deliverable on it. ([npm](https://www.npmjs.com/package/@dnd-kit/react))

1. **`closestCorners`, not `closestCenter`** for stacked columns — `closestCenter` resolves to the column droppable instead of the items inside it. Better still, compose `pointerWithin` → fall back to `rectIntersection` (the fallback is **required**, since `pointerWithin` doesn't work for the keyboard sensor). ([collision-detection docs](https://dndkit.com/api-documentation/context-provider/collision-detection-algorithms))
2. **Stale closures in `onDragOver`** freeze state after a cross-container drag. Use functional `setState` updaters. ([#386](https://github.com/clauderic/dnd-kit/issues/386))
3. **"Too many re-renders"** from setting state on every `onDragOver`. Guard: only move when the target container actually changes. ([#1421](https://github.com/clauderic/dnd-kit/issues/1421))
4. **Items jump on drop** if you pass a fresh `items.map(i => i.id)` array inline to `SortableContext` — it breaks the internal index cache. **Memoise the id array**, and use `arrayMove` in `onDragEnd`. ([#104](https://github.com/clauderic/dnd-kit/issues/104))
5. **Keep `DragOverlay` mounted** — conditional rendering breaks the drop animation.
6. **Stable, unique string ids.** Prefix them (`grp-<id>` / `trv-<id>`) so a group drag is distinguishable from a traveller drag.
7. **No virtualization needed** at 50–200 items.

---

## 6. PDF generation — the library trap

**Verified library facts:**

| Library | rowSpan | Verdict |
|---|---|---|
| `@react-pdf/renderer` | **Not supported** ([#3002](https://github.com/diegomura/react-pdf/issues/3002)) | Server-side OK, fast |
| `pdfmake` | Supported, but **renders incorrectly when a page break falls inside spanned rows** ([#2274](https://github.com/bpampuch/pdfmake/issues/2274)) | Page breaks are guaranteed on a daily manifest → avoid |
| Puppeteer HTML→PDF | Real rowSpan + `break-inside: avoid` | ~170MB Chromium; exceeds Vercel's 50MB function limit without `@sparticuz/chromium` |
| `jsPDF` + `jspdf-autotable` | Supported, fragile across page breaks | Already installed |

**Resolution adopted (see MASTER_PLAN):** sidestep the entire class of bug. **Do not build a monolithic rowSpan table in any library.** Render **one small `autoTable` block per group**, under a bold group header band. The continuous `No` counter is just an integer held across calls — it never needed a single table. This keeps `jsPDF`, adds zero dependencies, dodges every documented failure mode, *and* matches best practice for a printed operational manifest (one table per group, big times, check-in boxes, ≥11pt).

Escape hatch if fidelity ever demands it: `@react-pdf/renderer` with a per-group block layout (never rowSpan).

---

## 7. Concurrency & audit for 3 shared staff

- **Optimistic locking via a `version` integer column.** `UPDATE … WHERE id = ? AND version = ?`, `SET version = version + 1`; **0 rows affected ⇒ someone else changed it ⇒ reject and reload.** Postgres has no built-in optimistic locking; the version column is the standard pattern. ([reintech](https://reintech.io/blog/implementing-optimistic-locking-postgresql))
- **Last-write-wins is not acceptable here.** On a drag-and-drop board it silently discards a colleague's reassignment — precisely the "documents disagree with the system" trust failure operators complain about.
- **The capacity race is separate.** Two staff filling the last seat concurrently is not caught by per-row optimistic locking. Do the capacity check + assignment **in one transaction** with `SELECT … FOR UPDATE` on the target group row.
- **Minimum viable audit:** `created_by` / `updated_by` / `updated_at` everywhere (their Excel's `sign up` column, promoted to a real field), plus one append-only `audit_log` (`entity`, `entity_id`, `action`, `changed_by`, `at`, `diff jsonb`). At 400–500 travellers/month this is trivial volume and answers every "who moved this?" question a 3-person team asks.
- **No websockets/CRDTs needed** at 3 desktop users. Supabase Realtime is a cheap later add if simultaneous editing proves rough.

---

## 8. Ranked recommendations

### Cheap wins — do now
1. `firstName` / `lastName` / `dateOfBirth` / `nationality` as first-class traveller fields (§2). Highest value-to-effort item in the project.
2. Grouped manifest as **per-group table blocks**, generated from the board, never re-typed (§6, §4).
3. `version` columns + `audit_log` + `created_by`/`updated_by` (§7).
4. Booking **states**, not deletions: confirmed / no-show / cancelled / waitlisted.
5. Keep per-traveller gross vs cost vs margin — competitors gate this behind pricey tiers.
6. Language as a **grouping constraint**, not just a label — a guide runs a group in one language.
7. Store the 5 WhatsApp templates with `{name}` / `{time}` / `{meeting_point}` interpolation.

### High-value follow-ons

> **Superseded framing.** These were originally listed as "worth quoting as paid additions," scoped against the commercial proposal. That framing is dead: [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) promotes the WhatsApp composer and the Colosseum deadline radar to **core pillars**. Items 1 and 2 below are *the product*, not add-ons. The evidence is unchanged; only the priority moved.
1. **Viator Extranet CSV importer** — the real answer to the manual-entry pain, no API certification (§3). The flagship paid feature.
2. Colosseum timed-slot / ticket inventory tracked **separately** from guide capacity; surface the 30-day sale window and 7-day name-change deadline as reminders.
3. Waitlist + capacity-safe transactional assignment.
4. Guide rollup / commission statement.
5. Supabase Realtime board sync.

### Explicitly do NOT build
1. The Viator **Supplier API** integration — push-only, mandatory availability endpoints, certification. Disproportionate, and it *still* won't pull bookings.
2. The Viator **Partner/Merchant API** — wrong tool.
3. **Email-HTML parsing** as the primary import channel.
4. A **monolithic rowSpan** manifest table in any library.
5. A native **mobile guide app** or CRDT realtime collaboration.
6. Channel-manager / booking-widget / OTA-distribution features. This is a back-office tool.
