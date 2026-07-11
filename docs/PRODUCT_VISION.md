# Product Vision — What "Best" Actually Means Here

> Written after setting the commercial proposal aside. The proposal scoped a booking database with a paste-and-fill accelerator. The evidence says that solves the **second**-biggest problem.

---

## The thesis

**Sun Tours does not need a reservation database. They need something that runs their day.**

Their Excel is not a record of bookings. It is a **workflow tracker that is quietly failing**. The booking columns are complete and accurate. The columns that track *work* are half-empty, and the last one has never been filled in at all.

Every booking passes through a pipeline: greet → collect ID-exact names → confirm attendance → buy timed-entry tickets → group and assign a guide → coordinate the meeting time → run the tour → request a review. Their spreadsheet has a column for each of these stages. **Staff update them by typing `OK` by hand, and so, increasingly, they don't.**

The product that wins is the one where **doing the work marks the work as done.**

---

## The evidence

From `July 2026.xlsx` — 106 bookings, 363 travellers, €25,615 gross.

### The tracking columns are decaying

| Column | Purpose | Filled |
|---|---|---|
| `M` | call / message sent | 58.7% |
| `N` | confirmation received | 55.4% |
| `O` | ticket purchased + entry time | 52.3% |
| `R` | which staff member entered it | **4.1%** |
| `Q` | review requested | **0.0%** |

`Q` contains exactly one cell: the header, misspelled `Rivew`. **The review-request step has never been performed, not once, in a month of 363 travellers.**

They wrote the template. It sits in the `Sending Message` sheet, in three languages. It says, in their own words:

> *"Every single review makes a big difference for our small local company."*

And it has never been sent, because sending it means opening WhatsApp, finding the traveller, copying the template out of a spreadsheet, personalising it, and then going back to type `OK` in a cell.

### They cannot compute their own profit

Gross (`col I`) is recorded on **363 of 363** rows. Cost (`col J`) on **136**.

| | |
|---|---|
| Gross, July | €25,615.45 |
| Cost, recorded | €5,376.60 (37% of rows) |
| Implied margin | **79% — fiction** |
| Margin if the gap is filled at their own €39.53 average | **~44%** |

A 35-point error in the only number that decides whether a product is worth running. They are not being careless; the sheet makes the honest answer expensive to obtain.

### The manual arithmetic

Viator reports a booking **total**. Their sheet wants **per traveller**. `320.26 ÷ 2 = 160.13`, keyed in by hand. Column `S` still holds the scratch working: `606 / 13 = 46.6153846…`

### The data itself is drifting

Rows are not in date order (8 Jul appears above 6 Jul). The `N0` counter is wrong in places (`1,2,1,2,1`; two rows both numbered `5`). Column `F`, headed *"Name of Guide"*, contains the digit `1` on all 363 rows — the real guide name lives in column `P`, headed *"description"*.

---

## Where the hours actually go

106 bookings/month. Rough, but the ratio is what matters:

| Activity | Volume | Est. time | **Hours/month** |
|---|---|---|---|
| Typing bookings in | 106 × ~4 min | | **~7** |
| Sending 4 WhatsApp messages per booking | 424 × ~2 min | | **~14** |
| Chasing missing names | ongoing | | **?** |
| Grouping + rebuilding the print sheet | daily | | **~6** |
| Reconciling money | monthly | | **~2** |

**Paste & Fill attacks the 7-hour column.** The messaging pipeline is twice the size, *and* it is the part that's visibly failing.

The proposal optimised the wrong bottleneck. Not wrongly — reasonably, on the information available. The spreadsheet's empty columns are what changed the picture.

---

## The product, in one sentence

> Every morning it tells them: **who hasn't sent their names, whose tickets aren't bought, which group has no guide, and who needs a message today — and then sends the message.**

---

## The seven pillars

Ranked by friction removed per unit of build.

### 1. The daily board and the manifest
Travellers dragged into capacity-limited groups; the PDF generated from the board and never re-typed. Already specified in [`MASTER_PLAN.md`](./MASTER_PLAN.md). This is the thing the client called *"a very important functionality."* **No competitor ships it** — Rezdy, FareHarbor, Bókun and Ventrata all offer read-only manifests plus dropdown reassignment.

### 2. The WhatsApp composer — the keystone
Their five templates × three languages, already written, moved out of the spreadsheet and into the app with `{name}` / `{time}` / `{meeting_point}` interpolation.

One click opens WhatsApp with the message pre-filled:

```
https://wa.me/<phone>?text=<url-encoded body>
```

*(WhatsApp's Click-to-Chat opens the composer with the text ready; the staff member still presses send. It cannot auto-send — and it shouldn't.)*

**Sending marks the stage complete, timestamped, attributed.** Columns `M`, `N`, `O` and `Q` stop being chores and become a by-product. This is the single change that stops the decay — and it makes the review request, currently at 0%, a one-click action on a booking that already has a phone number and a language.

### 3. The booking pipeline
Replace free-text `OK` with real stages: `greeted → names collected → confirmed → ticketed → grouped → coordinated → completed → review requested`. Each carries a timestamp and an actor. The dashboard shows what is stuck and where.

### 4. The deadline radar — enforced by law, not preference
The Colosseum sells timed-entry tickets from **30 days** before, and permits name changes only up to **7 days** before ([`RESEARCH.md`](./RESEARCH.md) §2). Those are hard dates, and today nothing surfaces them.

> ⚠ **12 Aug** — 3 bookings, 9 travellers, no names collected. **Name lock in 2 days.**
> ⚠ **14 Aug** — tickets purchasable from today.

Missing this means a traveller is refused at the gate. It is the highest-stakes thing the software can do for them, it is entirely derivable from data already in the system, and no competitor does it because no competitor knows about the Colosseum.

### 5. Paste & Fill
Still worth building — see [`FAST_ENTRY.md`](./FAST_ENTRY.md). One paste of the Viator booking page replaces ~25 typed fields, and the app does the `total ÷ pax` division. It has simply been demoted from flagship to **one pillar among several**. Its parser must reject the masked phone (`+1 ***-***-****`).

### 6. Money that is actually true
Per-traveller gross and cost, so margin per **product**, per **group**, per **month** is a fact rather than an estimate. Make cost a per-product default that staff set once, so the 37%-filled column becomes 100% by construction. This number is currently unknowable, and it is the number that decides which tours to keep running.

### 7. Never lose anything
An append-only audit log; `who` and `when` on every mutation; optimistic locking so two staff cannot silently overwrite each other; soft delete. Their `R` column — "who entered this" — is filled 4% of the time. Make it automatic and it is 100%.

---

## Discipline: what "best" does *not* mean

This is a three-person company. **Disproportionate engineering is a real failure mode**, and the temptation is to build a platform.

Explicitly out of scope, permanently:

- **Viator API integration.** The Supplier API is push-only and cannot list your bookings; the Partner API is for reselling other people's products. The client independently rejected an OTA connection. Nothing here is a loss.
- **Email-HTML parsing.** Undocumented, unversioned format.
- **A native mobile guide app.** Mobile manifest editing is a *top complaint* against FareHarbor. A clean printed PDF beats it.
- **Realtime collaboration / CRDTs.** Three desktop users. Optimistic locking and a reload prompt are sufficient and honest.
- **An auto-optimising grouping algorithm.** Staff who know the customers will beat a packer and distrust it. Offer a first-fit *suggestion* they can override; never an authority.
- **Channel manager, booking widgets, OTA distribution.** This is a back-office tool. 90% comes from Viator. Stay out of the sales side.
- **Multi-currency.** All 363 rows in their workbook are EUR. **The client never confirmed this** — we asked, and question 5 went unanswered ([`OPEN-02`](../client/REQUIREMENTS.md)). Building EUR-only is our call, and a safe one; just don't tell him he chose it.

---

## Sequence

**Now — the demo that wins the room**
1. PGlite cutover; fix the traveller-wipe bug (`app/api/bookings/[id]/route.ts`)
2. Schema: groups, guides, product options, traveller `firstName`/`lastName`/`dateOfBirth`
3. The drag-and-drop schedule board
4. The grouped PDF manifest, diffed against their hidden `Print 5 oct` sheet

**Next — the part that changes their week**
5. Booking pipeline stages, replacing the `OK` columns
6. WhatsApp composer with the five templates
7. The deadline radar

**Then — the part that pays for itself**
8. Paste & Fill with `total ÷ pax`
9. Per-product cost defaults; real margin reporting
10. Audit log and optimistic locking

**Later, only if asked:** Supabase for genuine multi-user access · Extranet CSV bulk import (still manual — a human exports and uploads) · guide payroll rollups · waitlists.

---

## How we will know it worked

Not "the client liked the demo." These are measurable against the July baseline:

| | Baseline (Jul 2026) | Target |
|---|---|---|
| Review requests sent | **0%** | > 80% of completed tours |
| Bookings with all names before the 7-day lock | unknown, untracked | 100%, alerted |
| Cost recorded | 37% of rows | 100% by construction |
| Stage tracking (`M`/`N`/`O`) | ~55% | 100% as a by-product |
| Attribution (`R`) | 4% | 100% automatic |
| Margin | uncomputable | per product, per month |

The review number is the one to watch. Their Viator listings range from **192 reviews** on one product to **1** on another, and reviews are what a small operator on a marketplace actually competes on. A step that currently never happens, made one click, on 363 travellers a month.

That is the best product available here — and most of it is small.
