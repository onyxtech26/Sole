# Handoff — Start Here

You are picking up **Sole**, an internal reservation dashboard for a Rome tour operator. Everything you need is in this repo. Read this page first; it takes five minutes and will save you a day.

---

## Read in this order

| # | Doc | Why |
|---|---|---|
| 1 | [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) | **Why** this exists. Their spreadsheet is a workflow tracker that's failing. Read it or you'll build the wrong thing. |
| 2 | [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) | Ground truth, decisions already made, and the traps. Paste it at the top of any AI session. |
| 3 | [`MASTER_PLAN.md`](./MASTER_PLAN.md) | **How.** Build order and verification for the current iteration. |
| 4 | [`DESIGN.md`](./DESIGN.md) | The visual + interaction spec. Measured tokens, monochrome status vocabulary, board wireframe, print rules. |
| 5 | [`RESEARCH.md`](./RESEARCH.md) | Cited evidence. Consult when you want to know *why* a decision was made. |
| 6 | [`FAST_ENTRY.md`](./FAST_ENTRY.md) | The Paste & Fill parser spec. Later iteration. |
| — | [`FRONTEND_PROMPT.md`](./FRONTEND_PROMPT.md) | **Self-contained prompt to build the schedule board.** Paste into Claude — works with or without the repo. |

`../CLAUDE.md` is loaded automatically by Claude Code. `.claude/agents/` holds seven specialist agents (`db-architect`, `api-engineer`, `board-engineer`, `uiux-designer`, `pdf-engineer`, `domain-researcher`, `qa-verifier`) — each carries the traps for its area.

---

## Get it running

```bash
cd dashboard
pnpm install
pnpm dev            # http://localhost:3000
```

Log in with `admin@sole.demo` / `demo123`.

**Today** the app runs on a hand-rolled JSON "database" with an absolute `C:\` path baked into `lib/db/index.ts:30`. **It will not run on your machine until you do step 1 of the plan** (replace it with PGlite). That is deliberate — that file is being deleted, not fixed.

> ⚠ **`dashboard/README.md` is stale.** It says styling is Tailwind (it isn't — plain CSS in `app/globals.css`) and that you need a Postgres `DATABASE_URL` (you won't — PGlite). Trust `MASTER_PLAN.md` over it. Fix or delete the README as you go.

---

## Do these two things before anything else

**1. Replace the mock database with PGlite** — `MASTER_PLAN.md` §3.
Every route imports `db`, so this touches all of them at once. Do it alone, verify every existing page, then continue.

**2. Fix the traveller-wipe bug** — `MASTER_PLAN.md` §4, at `app/api/bookings/[id]/route.ts:214`.
It deletes and re-inserts every traveller on each booking edit. Harmless today. The moment travellers carry a `groupId`, **editing a booking's notes silently destroys that day's grouping.** Non-negotiable, and it lands before any grouping code.

Nothing else in the plan is safe to start until both are done.

---

## The one thing to get right

**Grouping is at traveller level, not booking level.**

Staff merge travellers *from different bookings* into a tour group, and split *one booking* across several groups. Verified in the client's real data for 12 July 2026: an 8-person booking went 6 → Group 1 (09:30, guide Felice) and 2 → Group 2 (09:45, guide Carlo Maria), while Group 2 simultaneously held travellers from two other bookings.

`bookings.groupId` is wrong. It is `travellers.groupId`.

---

## Test data

[`fixtures/2026-07-12.json`](./fixtures/2026-07-12.json) is the canonical day: 6 bookings, 29 travellers, one booking split across two groups, one group drawing from three bookings. Use it for the auto-group packer and the PDF.

**Names, phones and booking references in it are synthetic.** Party sizes, tour types, times, prices and the group split are real.

---

## ⚠ Client data — do not commit

Three files sit in the repo root and are **gitignored on purpose**:

| File | Contains |
|---|---|
| `July 2026.xlsx` | **363 real travellers: full names + phone numbers** |
| `Project Brief.pdf` | a real booking, including a customer's phone number |
| `project proposal.pdf` | commercial pricing |

Get them from your teammate over a private channel. Never `git add -f` them. If you need to reason about their contents, `RESEARCH.md` §1 reproduces the structure without the personal data.

The workbook's hidden sheet, **`Print 5 oct`**, is the spec for the PDF manifest — its exact column layout is transcribed in `RESEARCH.md` §1 and `MASTER_PLAN.md` §8, so you can build without opening the file. To *verify*, you'll want the real sheet in front of you.

---

## Open questions — ask the client before building these

None of these block the current iteration. All three block a later one.

1. **Where do per-age-band prices come from on mixed adult/child bookings?** The Viator page shows only a booking *total*. The child ratio is not derivable — 0.52 in one booking, 0.59 in another. Possibly further down the page, below the screenshot crop. *(Blocks: Paste & Fill's price split.)*
2. **Which parent product does each sub-product sit under?** `Semi-Private Colosseo`, `Just Colosseo`, `Arena Ticket + Virtual Tour` don't appear in the Viator product list — they're tour grades (TG1/TG2/TG3) under a parent. *(Blocks: product/sub-product CRUD.)*
3. **What are the Extranet CSV export's columns?** Confirmed to exist; schema unverified. Have them export one real file. *(Blocks: bulk import, if ever wanted.)*

---

## Definition of done, this iteration

1. Staff drag travellers into groups on a daily board; assignments survive a reload.
2. The PDF reproduces the `Print 5 oct` layout, generated from the board.
3. Editing a booking no longer destroys the day's grouping.

**Verify by driving the app.** `pnpm dev`, drag something, reload, regenerate the PDF. A typecheck is not verification — see `MASTER_PLAN.md` §10 for the full checklist, and the `qa-verifier` agent for the regressions that have already bitten once.
