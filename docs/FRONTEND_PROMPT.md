# Frontend Build Prompt — Sole

> **Paste everything below into Claude.** It is self-contained: no repo access needed.
> If you *do* have the repo, the real files are `dashboard/app/**`, `dashboard/components/**`, `dashboard/app/globals.css`.

---

You are building the frontend of **Sole**, an internal back-office web app for **Sun Tours Travels**, a tour operator in Rome that runs guided Colosseum tours.

Three staff use it, every morning, under time pressure. It replaces an Excel spreadsheet. It is **desktop-only** — the client explicitly waived mobile responsiveness. Do not build responsive layouts.

## Stack and hard constraints

- **Next.js 16 (App Router) · React 19 · TypeScript**
- **Styling is hand-written plain CSS in a single `app/globals.css`.** Tailwind v4 is installed but **the UI uses zero utility classes.** There is **no component library** — no shadcn, MUI, Radix, Chakra. **Do not add any.** This is not negotiable; it is the existing codebase convention.
- Drag and drop: **`@dnd-kit/core` + `@dnd-kit/sortable`**. Not `@dnd-kit/react` (a pre-1.0 rewrite).
- **Strict monochrome.** Black, grey, white. No accent colour exists anywhere in this product.

## Design tokens — use exactly these

```css
:root {
  --ink:     #171717;  /* primary text */
  --muted:   #737373;  /* secondary text, meta */
  --line:    #e5e5e5;  /* hairline borders */
  --surface: #ffffff;  /* panels, cards */
  --canvas:  #fafafa;  /* page background */
}
body { font-family: Arial, Helvetica, sans-serif; }
```

Do not introduce a typeface. Do not introduce a colour. If you feel you need one, you have misunderstood the next section.

### Type scale (already in use — match it)

| Element | Size | Weight |
|---|---|---|
| Page `h1` | 28px, letter-spacing `-.035em` | — |
| Section `h2` | 22px, `-.03em` | — |
| Panel / table head | 12–13px | 700 |
| Body, nav | 13px | — |
| Meta | 11–12px | 700 |
| Eyebrow label | 10px, `.15em` | 800 |
| Badge | 10px | 800 |

### Existing classes to reuse, not reinvent

`.app-shell` `.sidebar` `.main-content` `.topbar` `.content-stack` `.panel` `.panel-heading` `.table-head` `.table-wrap` `.badge` `.toolbar` `.empty-state` `.toast` `.outline-button` `.primary-button` `.text-button` `.muted` `.truncate`

The `.badge` family already proves status works without colour:

```css
.badge.confirmed { background:#262626; color:#fff; }                /* solid   */
.badge.pending   { background:#f5f5f5; border:1px solid #d4d4d4; }  /* outline */
.badge.completed { background:#fff; border:1px solid #000; }        /* hollow  */
.badge.cancelled { background:#f5f5f5; color:#737373; text-decoration:line-through; }
```

Extend that vocabulary. Do not create a parallel one.

---

## What you are building: the daily schedule board

**This is the heart of the product.** Route: `/schedule?date=YYYY-MM-DD`.

### The domain — read twice

Bookings arrive from Viator with a **booked time**. Staff then consolidate travellers **from different bookings** into **tour groups**. Each group has its own **actual departure time**, an **entry/ticket time**, an assigned **guide**, and a **capacity** (7 or 24, set by the tour type).

**Grouping is at traveller level, not booking level.**

A single booking gets **split across groups**. Real example from their data: an 8-person booking went 6 travellers → Group 1 (departs 09:00, enters 09:30, guide Felice) and 2 travellers → Group 2 (enters 09:45, guide Carlo Maria). That same Group 2 simultaneously held travellers from two *other* bookings — 3 and 2 — for a total of 7.

So a group's members come from many bookings, and a booking's members land in many groups.

### Layout

A pinned **Unassigned** left rail + a horizontally-scrolling strip of group cards, ordered by departure time.

**Not a timeline / gantt.** A timeline optimises for *when*; the job here is *who is in which bucket*.

```
┌────────────────┬──────────────────────────────────────────────────────┐
│ ◀ Fri 10 Jul ▶ │  [+ New group]                    [Print manifest]   │
├────────────────┼──────────────────────────────────────────────────────┤
│ UNASSIGNED  23 │ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ ┌────────────┐ │ │Colosseo guide │ │Colosseo guide │ │Semi-Private  │ │
│ │ search…    │ │ │09:00 ent 9:30 │ │09:00 ent 9:45 │ │10:00 ent10:15│ │
│ └────────────┘ │ │Guide: Felice  │ │Guide: —     ⚠ │ │Guide: Orietta│ │
│ ┌────────────┐ │ │  6 / 7        │ │  7 / 7  FULL  │ │ 8 / 7  OVER ⚠│ │
│ │⠿ Rossi  (4)│ │ ├───────────────┤ ├───────────────┤ ├──────────────┤ │
│ │  VT-1183   │ │ │⠿ Fairbank  (6)│ │⠿ Fairbank ½(2)│ │⠿ Hensley  (6)│ │
│ ├────────────┤ │ │               │ │  2 of 8 here  │ │              │ │
│ │⠿ Khan   (2)│ │ │               │ │⠿ Rossi     (3)│ │              │ │
│ └────────────┘ │ └───────────────┘ └───────────────┘ └──────────────┘ │
└────────────────┴──────────────────────────────────────────────────────┘
```

The Unassigned rail is **always visible** — it answers "who still needs placing" — and needs a **search box**, because a busy day has ~200 travellers.

### What wins the eye

Rank these. Do not let them compete.

1. **The capacity number** — `6 / 7`. It is why staff open this screen.
2. **The times** — departure and entry. A guide checks the clock constantly.
3. Traveller names.
4. Guide name, tour type.
5. Booking reference. Present, findable, never prominent.

If everything is 13px and `--ink`, nothing is. Weight and size do the ranking; colour cannot.

### Status must be readable without colour

Encode **redundantly**: word + weight + border + icon. Never one channel alone. Someone scanning fast must catch it peripherally.

| State | Encoding |
|---|---|
| Under capacity | `6 / 7`, normal border |
| Full (== capacity) | `7 / 7 FULL`, bold, solid filled header bar |
| **Over capacity** | `8 / 7 OVER ⚠`, thick border, diagonal-hatch fill |
| No guide assigned | `Guide: —` + ⚠, hollow/outline header |
| Unassigned rail | dashed left border |
| Split booking | `½` glyph + `2 of 8 here` |

**Over-capacity must be allowed.** Show the warning; accept the drop; save successfully. Staff routinely overfill a group and rebalance — a hard block makes their real workflow impossible to perform. A blocked drop is a bug, not a safeguard.

**The split-booking mark is the most important thing on this screen.** It is the state most likely to leave a traveller stranded at the meeting point. Make it unmissable.

### Density

- **Traveller rows 32–36px.** Tighter than "condensed" — a chip carries less than a full data row.
- **`font-variant-numeric: tabular-nums`** on `6 / 7`, times, and booking refs. Without it the digits shift horizontally on every drop. This is currently missing from the codebase; add it.
- **Hairline 1px `var(--line)` dividers. No zebra striping** — hover, selected, and dragging already spend the grey budget.
- Names left-aligned; counts and times right-aligned or in fixed monospace slots.
- **Drag-handle hit target ≥24×24px** even inside a 32px row. The whole row is draggable; the handle `⠿` is a hint, not the only target.

### Spacing and shape

- **Spacing scale: 4px base.** Use 4 / 8 / 12 / 16 / 24 / 32. Nothing else. No `padding: 15px`.
- **Border radius: 8px on panels and cards, 6px on buttons, 20px only on `.badge` pills.** Nothing else is rounded. No `border-radius: 12px`, no `9999px` on anything that isn't a badge.
- **No `box-shadow`. Anywhere.** Depth is expressed with a 1px `var(--line)` border. If two surfaces need separating, use a border, not a shadow.
- **No gradients.** Not on headers, not on buttons, not as a "subtle" background.
- **No blur, no glassmorphism, no `backdrop-filter`.**
- Borders are `1px solid var(--line)`. The only heavier border in the product is the over-capacity group card.

---

## This must not look like an AI made it

The failure mode is not ugliness — it is **genericness**. A screen that could belong to any SaaS product tells a Rome tour operator nothing about their morning.

### Banned outright

- ❌ Any icon library — no `lucide-react`, `react-icons`, `heroicons`. **Zero npm icon packages.** The only glyphs in this product are `⠿ ⚠ ½ — ◀ ▶` typed as literal characters.
- ❌ Emoji, anywhere, ever.
- ❌ `box-shadow`, gradients, `backdrop-filter`, glow, glassmorphism.
- ❌ Skeleton shimmer loaders.
- ❌ A centred empty state with a big illustration and a cheerful headline.
- ❌ Rounded-full pills for anything except `.badge`.
- ❌ Icon-only buttons with no label.
- ❌ Cards nested inside cards inside cards.
- ❌ `Inter`, `Geist`, or any webfont. The font is `Arial, Helvetica, sans-serif`. It is already installed on every machine in that Rome office.
- ❌ A stat-tile row across the top ("Total Bookings · Total Travellers · Revenue") that nobody asked for.
- ❌ Hover effects that move things. `transform: translateY(-2px)` on hover is the single most recognisable AI tell in a card layout.

### Microcopy

Operational tone. Terse. Nouns and numbers.

- ✅ `No groups yet.` · `23 unassigned` · `8 / 7 OVER` · `Guide: —`
- ❌ `Oops! Something went wrong 😕` · `Let's get started!` · `Great job! 🎉` · `No data to display at this time.`

No exclamation marks. No first-person plural. No reassurance. These are three professionals who have done this job for years; the software should not congratulate them for dragging a name into a box.

### Steal from

Not from dashboard galleries. From:

- **A printed flight departure board** — dense, monospaced times, status as a word.
- **The spreadsheet this replaces.** Staff already read a tight grid fluently. Do not "improve" it into airy cards.
- **A restaurant floor plan** at service — capacity per table, at a glance, no chrome.
- **Linear's issue list** for row density and restraint. Not for its colour or its icons.

### The states, specified

Do not invent these. There are four, and they are all one line of text.

| State | Render |
|---|---|
| Loading the board | `Loading…` in `var(--muted)`, 13px, left-aligned, in place. No spinner, no skeleton. |
| No groups yet | `No groups yet.` + the `[+ New group]` button. Nothing else. |
| Unassigned rail empty | `Everyone is assigned.` in `var(--muted)`. |
| Reorder request failed | Board rolls back; `.toast` reads `Could not save. Reloaded.` |

---

## dnd-kit — the documented traps

One `<DndContext>`. One `<SortableContext>` per group **and** one for the Unassigned rail. Each column is also a droppable, so you can drop into an empty group.

1. **`closestCorners`, not `closestCenter`** — the latter resolves to the whole-column droppable instead of the items inside it. Better, compose:
   ```js
   const pointer = pointerWithin(args);
   return pointer.length ? pointer : rectIntersection(args); // fallback REQUIRED for keyboard sensor
   ```
2. **Use functional `setState` updaters inside `onDragOver`.** Values closed over at drag start go stale and freeze the board after a cross-container drag. ([dnd-kit #386](https://github.com/clauderic/dnd-kit/issues/386))
3. **Guard the move** — only update state when the target container actually changes, or you get "too many re-renders". ([#1421](https://github.com/clauderic/dnd-kit/issues/1421))
4. **Memoise the `SortableContext` id array.** A fresh `items.map(i => i.id)` each render breaks the internal index cache and items visibly jump. Use `arrayMove` in `onDragEnd`. ([#104](https://github.com/clauderic/dnd-kit/issues/104))
5. **Keep `<DragOverlay>` mounted.** Conditional rendering breaks the drop animation.
6. **Prefix sortable ids** — `grp-<id>` and `trv-<id>` — so a group drag is distinguishable from a traveller drag.
7. **No virtualization.** 50–200 items is well within range.

If cross-container `onDragOver` proves flaky, fall back to: `onDragOver` renders only the drop indicator; `onDragEnd` commits the authoritative move.

---

## Data shapes

```ts
type TravellerCard = {
  id: number;
  groupId: number | null;        // null = Unassigned
  sortOrder: number;
  firstName: string;
  lastName: string;
  type: "Adult" | "Child" | "Infant";
  bookingId: number;
  bookingRef: string;            // "BR-1414119089"
  bookedTime: string;            // "09:00" — what the customer bought
  partySize: number;             // travellers in this booking, total
  countInThisGroup: number;      // for the split indicator: "2 of 8"
  phone: string;
  language: string;              // "English" | "Spanish" | "Portuguese"
};

type GroupCard = {
  id: number;
  sortOrder: number;
  productName: string;           // short operational name, e.g. "Colosseo guide"
  optionCode: string | null;     // "TG1" | "TG2" | "TG3"
  departureTime: string | null;  // "09:00" — the group's actual departure
  ticketTime: string | null;     // "09:30" — timed entry
  guideId: number | null;
  guideName: string | null;
  capacity: number;              // effective: group override ?? tour-grade default
  ticketStatus: string;          // "Ticket done 9:45"
  travellers: TravellerCard[];
};

type BoardData = {
  serviceDate: string;           // "2026-07-12"
  groups: GroupCard[];
  unassigned: TravellerCard[];
  guides: { id: number; name: string }[];
};
```

## API contract

```
GET    /api/schedule?date=YYYY-MM-DD   → BoardData
POST   /api/schedule/reorder           → { warnings: {groupId,count,capacity}[] }
POST   /api/schedule/groups
PATCH  /api/schedule/groups/[id]
DELETE /api/schedule/groups/[id]
```

`reorder` sends only the containers that changed:

```ts
{ serviceDate: string,
  containers: { groupId: number | null, travellerIds: number[] }[],
  groupOrder?: number[] }
```

**Optimistic UI:** snapshot state *before* mutating, apply the move locally, fire the request. On failure, **roll back to the snapshot** and toast. A `409` means another staff member changed that group — reload the board and say so; do not retry blindly.

*If you are building standalone without a backend, mock these endpoints and hard-code `BoardData` from the fixture in the next section.*

---

## Test fixture — 12 July 2026

The canonical day. Six bookings, 29 travellers. Booking `BR-1414100003` has **8 travellers split across two groups**; Group 2 holds 3 + 2 + 2 = **7 travellers drawn from three different bookings**.

| Booking | Tour | Booked | Pax | Groups |
|---|---|---|---|---|
| BR-1414100001 | Colosseo guide | 09:00 | 3 | 2 |
| BR-1414100002 | Colosseo guide | 10:00 | 2 | 2 |
| BR-1414100003 | Colosseo guide | 09:00 | 8 | **1 and 2** |
| BR-1414100004 | Semi-Private Colosseo | 09:00 | 6 | — |
| BR-1414100005 | Colosseo guide | 10:00 | 5 | — |
| BR-1414100006 | Private Colosseo | 09:00 | 5 | — |

Build against this. If your UI can't render booking `…003` legibly across two groups, the design has failed.

### Design against the worst row, not the average

A layout that only survives `Rossi (4)` will break in the Rome office on Monday morning. Render **all of these** before you call it done:

| Stress case | Real value |
|---|---|
| Long product name | `Private guided Tour of Colosseum, Roman Forum & Palatine Hill` (60 chars) |
| Long surname | `Maximiliana Featherstonehaugh` |
| Over capacity | `8 / 7 OVER ⚠` |
| No guide assigned | `Guide: —` |
| Booking split three ways | one booking, three group cards, `3 of 8` · `3 of 8` · `2 of 8` |
| A single-traveller booking | `(1)` — no plural |
| A group of 24 | tour grade `TG3`, capacity 24, scrolls inside the card |
| Non-English group | `PO` / `SP` — a guide runs a group in one language |
| Midnight-adjacent time | `00:15` — do not assume two digits before the colon are `≥ 06` |
| Empty group, just created | drop target must still be reachable |

The 60-character product name is the one that will hurt. Solve it with truncation plus a `title` attribute, or a short operational name (`Private Colosseo`) — **never** by letting the card grow.

---

## Components to produce

```
app/(dashboard)/schedule/page.tsx           // reads ?date, fetches, renders
components/schedule/schedule-board.tsx      // DndContext, optimistic state
components/schedule/unassigned-column.tsx   // droppable, groupId = null, search
components/schedule/group-column.tsx        // sortable column + droppable body
components/schedule/group-editor.tsx        // departureTime, ticketTime, guide, capacity
components/schedule/traveller-card.tsx      // useSortable item
```

Plus the CSS, appended to `app/globals.css` in the existing style — flat class names, no nesting frameworks.

---

## Do not build

- A timeline or gantt view
- Animations, transitions, confetti, capacity counters that count up
- Inline editing of traveller fields on the board — the board is for **placement**
- Mobile or touch tuning
- A colour palette, a theme switcher, dark mode
- Any component library, any CSS-in-JS, any Tailwind utility classes

## Acceptance criteria

1. Drag a traveller from Unassigned into a group; it lands where the placeholder showed.
2. Drag a traveller between two groups; both counts update.
3. Reorder travellers within a group.
4. Reorder the group columns themselves.
5. Overfill a group → `8 / 7 OVER ⚠` renders, **and the drop is accepted**.
6. Booking `…003` shows a split indicator in both groups, reading `6 of 8` and `2 of 8`.
7. A group with no guide shows `Guide: —` and a warning glyph.
8. Digits in `6 / 7` do not shift horizontally when the count changes.
9. Nothing on screen uses colour to carry meaning.
10. Simulate a failed `reorder` request → the board returns to its pre-drag state and a toast appears.
11. Every stress case in the table above renders without the layout breaking.
12. `grep -rE "box-shadow|linear-gradient|border-radius: *(1[0-9]|[2-9][0-9])px"` over your CSS returns nothing outside `.badge`.
13. `package.json` gained no dependency except `@dnd-kit/*`.

## Then look at it

Build it, then **drive it**. Open the board, drag a traveller between groups, overfill one, delete a group.

Screenshots lie about spacing, colour and type — inspect the computed styles instead. Check that `6 / 7` does not shift horizontally when it becomes `7 / 7`.

Then ask the only question that matters: **could a staff member, at 07:40, holding coffee, glance at this screen and know which group is short a guide?** If the answer needs a second look, the hierarchy is wrong — go back to *What wins the eye*.
