# Requirements Register

Every requirement, in one place, each traceable to the exact sentence it came from.

**Status is the point of this document.** Three values, and they are not interchangeable:

| Status | Meaning |
|---|---|
| 🟢 **CONFIRMED** | The client said it. Quote is in a transcript. Not up for debate. |
| 🟡 **DERIVED** | We inferred it from their data or from law. Defensible, cited — but *they never said it.* |
| 🔴 **OPEN** | Nobody knows. **Ask before building.** Never guess and never write "the client confirmed." |

Sources: `BRIEF` = `transcripts/2026-06-project-brief.md` · `MEET` = `transcripts/2026-07-07-meeting.md` · `WA` = `transcripts/2026-07-10-whatsapp.md` · `XLSX` = `July 2026.xlsx` · `LAW` = external, cited in `docs/RESEARCH.md`

---

## Core system — from the brief

| ID | Requirement | Status | Source |
|---|---|---|---|
| REQ-01 | Manual entry of reservation data, read from the Viator dashboard | 🟢 | BRIEF, MEET |
| REQ-02 | One centralized database with search, filtering, sorting | 🟢 | BRIEF |
| REQ-03 | Views: Today · Upcoming · Past · Cancelled | 🟢 | BRIEF |
| REQ-04 | Dashboard: daily reservations, traveller count, tour count, status | 🟢 | BRIEF |
| REQ-05 | Daily reports, exportable as PDF | 🟢 | BRIEF |
| REQ-06 | Edit, delete, and update reservation status | 🟢 | BRIEF |
| REQ-07 | Every reservation linked to its product/tour, for reporting by product | 🟢 | BRIEF |

## Platform — from the meeting

| ID | Requirement | Status | Source |
|---|---|---|---|
| REQ-08 | Web application, **not** a mobile app | 🟢 | MEET |
| REQ-09 | Online; multiple users entering data **from different locations** | 🟢 | MEET |
| REQ-10 | **Desktop-only.** Mobile responsiveness explicitly not required | 🟢 | MEET |
| REQ-11 | Manual entry. **Direct OTA/Viator connection explicitly rejected** | 🟢 | MEET |
| REQ-12 | Prototype for partner demo; function over design polish | 🟢 | MEET |
| REQ-13 | At least 3 staff will use it | 🟢 | WA |
| REQ-14 | ~400–500 travellers per month | 🟢 | WA |

> **REQ-09 is not satisfied by PGlite.** PGlite is single-process. Shipping requires the Supabase cutover.

## Grouping and products — from WhatsApp, 10 Jul

| ID | Requirement | Status | Source |
|---|---|---|---|
| REQ-15 | The PDF must include **all the information we enter into the system** | 🟢 | WA |
| REQ-16 | Schedule organised by **tour time, number of participants, tour type** — *"a very important functionality"* | 🟢 | WA |
| REQ-17 | The same grouping structure and information **must be reflected clearly in the PDF export** | 🟢 | WA |
| REQ-18 | Staff can **create new products themselves**, whenever they need | 🟢 | WA |
| REQ-19 | Each product has a unique **product code**; sub-products under it are identified **TG1, TG2, TG3** | 🟢 | WA |
| REQ-20 | The list must be **re-orderable by drag and drop** ("like the virtual tour stops you designed") | 🟢 | WA |
| REQ-21 | Group sizes vary by tour type **and ticket type** — *"such as up to 7 people or up to 24 people"* | 🟢 | WA |

## Derived from their data — they never said these

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| REQ-22 | **Grouping is at traveller level.** One booking splits across groups; one group draws from several bookings | 🟡 | XLSX 12 Jul: an 8-pax booking went 6 → Group 1 (guide Felice), 2 → Group 2 (guide Carlo Maria); Group 2 also held 3+2 from two other bookings |
| REQ-23 | A **guide** is assigned per group | 🟡 | XLSX col P: `Felice`, `Carlo Maria`, `Susanna 6 clients`. (Col F, headed "Name of Guide", contains the digit `1` on all 363 rows — mislabelled) |
| REQ-24 | Each group has an **entry/ticket time** distinct from departure | 🟡 | XLSX col O: `Ticket done 9:45`, `Group 2 Ticket done 9:45` |
| REQ-25 | **Booking Time ≠ departure Time.** Staff consolidate bookings into departures | 🟡 | Hidden sheet `Print 5 oct` has both columns, and they differ |
| REQ-26 | Per-traveller **gross, cost, and balance** | 🟡 | XLSX cols I/J/K. Gross on 363/363 rows; cost on only **136** |
| REQ-27 | **Language** per booking: `EN` (95), `SP` (5), `PO` (2) — recorded on the lead row | 🟡 | XLSX col E |
| REQ-28 | **Staff attribution** — who entered the booking | 🟡 | XLSX col R `sign up`: Neda, Aban, Masoud, Tina, Sina. Filled on only **4.1%** of rows |
| REQ-29 | The hidden **`Print 5 oct`** sheet is the PDF layout spec | 🟡 | `GRP. \| No \| Type of tour \| Date \| Booking Time \| Time \| Incoming \| Name \| Last name \| Type Age \| Telephone \| guide` |
| REQ-30 | Five **WhatsApp templates × 3 languages** (EN/ES/IT) exist and are used | 🟡 | XLSX sheet `Sending Message`. The review-request column is filled **0.0%** of the time |
| REQ-31 | Traveller **first and last name are separate fields** | 🟡 | `Print 5 oct` splits them; `travellers.name` is currently one column |

## Derived from law — cited, not client-stated

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| REQ-32 | Colosseum tickets are **nominative**: name must match photo ID at the gate | 🟡 | [colosseo.it](https://colosseo.it/en/opening-times-and-tickets/) |
| REQ-33 | **DOB and nationality drive price tier**: EU under-18 free, EU 18–24 pay €2 | 🟡 | Same. This is why their WhatsApp template asks for ID-exact names and minors' DOB |
| REQ-34 | Timed entry compulsory; tickets sell from **T-30**; names lock at **T-7** | 🟡 | Same |

---

## 🔴 OPEN — ask the client. Do not guess.

| ID | Question | Why it matters | Blocks |
|---|---|---|---|
| OPEN-01 | **Guides: assign only, or also track payment/confirmation?** | **Question 4 was asked on WhatsApp and never answered.** We chose assignment-only. That is *our* decision, not theirs | Guide payroll / commission |
| OPEN-02 | **Is EUR the only currency ever needed?** | **Question 5 was asked and never answered.** All 363 rows are EUR, but absence of evidence is not confirmation | Multi-currency support |
| OPEN-03 | Where do **per-age-band prices** come from on mixed adult/child bookings? | The Viator page shows only a booking total. Child ratio is not derivable: 0.52 in one booking, 0.59 in another | Paste & Fill price split |
| OPEN-04 | Which **parent product** does each sub-product sit under? | `Semi-Private Colosseo`, `Just Colosseo`, `Arena Ticket + Virtual Tour` don't appear in the product list — they're tour grades | Product/sub-product CRUD (REQ-18, REQ-19) |
| OPEN-05 | What are the **Extranet CSV export's columns**? | Confirmed to exist; schema unverified. Have them export one real file | Bulk import, if ever wanted |
| OPEN-06 | Should the system **send** the WhatsApp messages, or just compose them? | REQ-30 is derived. `wa.me` can only pre-fill a composer — it cannot auto-send | WhatsApp composer |

---

## Requirements the client has *not* asked for

We propose these in `docs/PRODUCT_VISION.md` on the strength of evidence, not instruction. **Label them as ours when you present them.**

- A booking **pipeline** with real stages, replacing the free-text `OK` columns (their tracking is at 52–59%, and the review column at **0%**)
- A **deadline radar** for the Colosseum's T-30 / T-7 windows (REQ-34)
- **Real margin** reporting (cost is recorded on 37% of rows; their implied 79% margin is fiction, ~44% in reality)
- **Paste & Fill** (this *was* sold in the proposal, so it is contractual — but the proposal is the only record, and that file has been deleted)
