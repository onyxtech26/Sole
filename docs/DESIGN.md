# Design Spec

The visual and interaction spec for Sole. Everything here is either **measured from the existing `dashboard/app/globals.css`** or **derived from cited research** ([`RESEARCH.md`](./RESEARCH.md) §5). Where a value is my recommendation rather than an existing fact, it says so.

Owner agent: `.claude/agents/uiux-designer.md`.

---

## 1. The constraints are the brief

- **Desktop-only.** The client explicitly waived mobile responsiveness (meeting notes, 7 Jul 2026). Don't pay the responsive tax.
- **Strict monochrome.** Black, grey, white. No accent colour exists.
- **Hand-written plain CSS in one file** — `app/globals.css`, 327 lines. Tailwind v4 is installed but **the UI uses zero utility classes**. There is no component library. **Do not add either.**
- This is an **operational tool used every morning under time pressure**, not a marketing page. Density and legibility beat polish.

---

## 2. What already exists — obey it

### Tokens (`globals.css:3-14`)

| Variable | Value | Use |
|---|---|---|
| `--ink` | `#171717` | primary text |
| `--muted` | `#737373` | secondary text, meta |
| `--line` | `#e5e5e5` | hairline borders |
| `--surface` | `#ffffff` | panels, cards |
| `--canvas` | `#fafafa` | page background |

### ⚠ Trap: five colour-named variables that hold greys

```css
--navy:  #171717;   /* black  — used once   */
--blue:  #000000;   /* black  — used ZERO times */
--teal:  #525252;   /* grey   — used ZERO times */
--amber: #737373;   /* grey   — used ZERO times */
--green: #404040;   /* grey   — used ZERO times */
```

Leftovers from the monochrome rebrand (`271e63d`). A developer who writes `var(--amber)` expecting orange gets grey. Same bug in `globals.css:41` — `.status-dot.green { background: #737373 }`.

**Delete `--blue`, `--teal`, `--amber`, `--green`. Inline the one `--navy` use.** Rename `.status-dot.green`. Do it early; every day they survive is a chance someone builds on them.

### Type scale (measured, in use)

| Element | Size | Weight |
|---|---|---|
| Page `h1` (`.topbar h1`) | 28px, `-.035em` | — |
| Section `h2` | 22px, `-.03em` | — |
| Panel / table head | 12–13px | 700 |
| Body, nav | 13px | — |
| Meta, `.date-control` | 11–12px | 700 |
| `.eyebrow` / `.workspace-label` | 10px, `.15em` | 800 |
| `.badge` | 10px | 800 |

Font is `Arial, Helvetica, sans-serif`. One family. **Do not add a typeface.**

### The badge precedent — status already works without colour

`globals.css:101-105` already encodes status through fill, border and decoration:

```css
.badge.confirmed { background:#262626; color:#fff; }                     /* solid  */
.badge.pending   { background:#f5f5f5; border:1px solid #d4d4d4; }       /* outline */
.badge.completed { background:#fff;    border:1px solid #000; }          /* hollow  */
.badge.cancelled { background:#f5f5f5; color:#737373; text-decoration:line-through; }
```

Extend this vocabulary. Don't invent a parallel one.

### Class vocabulary to reuse

`.app-shell` `.sidebar` `.main-content` `.topbar` `.content-stack` `.panel` `.panel-heading` `.table-head` `.table-wrap` `.badge` `.toolbar` `.empty-state` `.toast` `.outline-button` `.primary-button` `.text-button` `.muted` `.truncate`

---

## 3. The schedule board

Pinned **Unassigned** left rail + a horizontally-scrolling strip of capacity-badged group cards, ordered by departure time.

**Not a gantt.** A timeline optimises for *when*; the job here is *who is in which bucket*. dnd-kit's canonical "Multiple Containers" pattern is the right shape ([`RESEARCH.md`](./RESEARCH.md) §5).

```
┌────────────────┬──────────────────────────────────────────────────────┐
│ ◀ Fri 10 Jul ▶ │  [+ New group]                    [Print manifest]   │
├────────────────┼──────────────────────────────────────────────────────┤
│ UNASSIGNED  23 │ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ ┌────────────┐ │ │Colosseo guide │ │Colosseo guide │ │Semi-Private  │ │
│ │ search…    │ │ │09:00 ent 9:30 │ │09:00 ent 9:45 │ │10:00 ent 10:15│ │
│ └────────────┘ │ │Guide: Felice  │ │Guide: —     ⚠ │ │Guide: Orietta│ │
│ ┌────────────┐ │ │  6 / 7        │ │  7 / 7  FULL  │ │ 8 / 7  OVER ⚠│ │
│ │⠿ Rossi  (4)│ │ ├───────────────┤ ├───────────────┤ ├──────────────┤ │
│ │  VT-1183   │ │ │⠿ Fairbank  (6)│ │⠿ Fairbank ½(2)│ │⠿ Hensley  (6)│ │
│ ├────────────┤ │ │               │ │  2 of 8 here  │ │              │ │
│ │⠿ Khan   (2)│ │ │               │ │⠿ Rossi     (3)│ │              │ │
│ └────────────┘ │ └───────────────┘ └───────────────┘ └──────────────┘ │
└────────────────┴──────────────────────────────────────────────────────┘
```

The Unassigned rail is **pinned and always visible** — it is the source of truth for "who still needs placing" — and carries a search box, because 200 travellers is too many to scan.

---

## 4. Monochrome status vocabulary

Colour is unavailable, so meaning is **redundantly coded** across weight, fill, border, icon, and a text token — the technique colour-degraded cockpit displays use ([NASA](https://www.nasa.gov/human-systems-integration-division/cockpit-display-design-intelligent-spacecraft-interface-systems/)).

| State | Encoding |
|---|---|
| Under capacity | `6 / 7`, normal border |
| Full (== cap) | `7 / 7 FULL`, bold, solid filled header bar |
| **Over capacity** | `8 / 7 OVER ⚠`, thick border, diagonal-hatch fill |
| No guide assigned | `Guide: —` + ⚠, hollow/outline header |
| Unassigned rail | dashed left border |
| Split booking | `½` glyph + `2 of 8 here` |

**Never encode a state in one channel alone.** Someone scanning fast must catch it peripherally.

**Over-capacity is a warning, never a block.** Staff overfill and rebalance by design — their own data proves it (one group held 7 travellers drawn from three bookings). A blocked drop is a bug, not a safeguard.

**The split-booking mark is the most important thing on this screen.** It is the state most likely to cause a traveller to be left behind at the meeting point.

---

## 5. Density

Anchored on enterprise-table research ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)); px values are my recommendation.

- **Traveller rows 32–36px** — tighter than "condensed" (≈40px), since a chip carries less than a full data row.
- **Tabular numerals** for `6 / 7`, times, refs — `font-variant-numeric: tabular-nums`. **Currently used nowhere in `globals.css`.** Without it, `6 / 7` → `7 / 7` shifts on re-render.
- **Hairline 1px `var(--line)` dividers. No zebra striping.** Hover, selected, and dragging already spend the grey budget; zebra causes semantic-grey overload.
- Names and tour text left-aligned; counts and times right-aligned or in fixed monospace slots.
- **Drag-handle hit target ≥24×24px**, even inside a 32px row. The whole row is draggable; the handle is a hint, not the only target.

---

## 6. Drag affordances — build in this order

1. Persistent grip `⠿` at row start; cursor `grab` → `grabbing`
2. Always-visible `used / capacity` on the group header
3. **Over-capacity: allow the drop, flag it**
4. Insertion placeholder — a gap showing where the chip lands
5. `DragOverlay` chip (name + party size). **Keep it mounted** — conditional rendering breaks the drop animation. For multi-select, a stacked overlay with a count badge ("3 selected"), not a list
6. **Split mark on every fragment**
7. Multi-select then drag — staff move whole families
8. Keyboard sensor, or a "Move to group…" menu. DnD is inaccessible by default and this is a daily tool

**Skip:** timeline view, capacity animations, confetti, elaborate transitions, inline field editing on the board, touch tuning.

---

## 7. Print — a different medium, a different design

### ⚠ There are already two print paths, and they will drift

| Path | Where | Produces |
|---|---|---|
| `@media print` + `.print-sheet` | `globals.css:203, 248-269` | browser-printed report *preview* |
| `jsPDF` + `autoTable` | `app/api/reports/pdf/route.ts` | the downloaded PDF |

**Two renderers of the same data is exactly the failure that erodes trust** — "time/date mismatches between the system and documents sent to travellers" is a top competitor complaint ([`RESEARCH.md`](./RESEARCH.md) §4).

**Pick one.** The guide's manifest is the jsPDF path. Either delete the `.print-sheet` browser-print route or reduce it to a visibly non-authoritative preview. Do not maintain both as sources of truth.

### The manifest itself

Strip everything screen-only: drag handles, capacity math, `FULL`/`OVER` badges (a printed sheet is post-decision), filters, hover states, the unassigned rail.

- **One block per group**, one guest per row, under a bold group header band
- **Departure + entry time are the largest elements on the band** — a guide checks the clock constantly
- Include a **check-in box** column; guides tick people off
- Body text **≥11pt**, line spacing 1.15–1.5, black on white, flush left
- A split booking shows its **local** pax count plus `part of VT-1183 · 2 of 8`, so nobody double-counts

Layout and page-break rules: [`MASTER_PLAN.md`](./MASTER_PLAN.md) §8. **Never a monolithic rowSpan table** — it breaks across page boundaries in every PDF library.

---

## 8. Working rules

- Research before inventing. Cite sources; separate evidence from judgement.
- Propose concrete values — px, weights, glyphs — not adjectives.
- After changing `globals.css`, **look at the result.** Use `preview_inspect` over screenshots for verifying colour, spacing and type; screenshots lie about all three.
- The board and the manifest render the same data. If the screen and the paper ever disagree, that is a trust failure, not a cosmetic one.
