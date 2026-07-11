---
what: The screenshot the client sent on WhatsApp, 10 Jul 2026
shows: Sheet `July` of `July 2026.xlsx`, rows 177–209 — the schedule for Sun 12 Jul 2026
original: client/raw/July 2026.xlsx  (gitignored — contains real names and phone numbers)
status: TRANSCRIBED + PSEUDONYMISED. Structure, times, prices and grouping are exact.
---

# The 12 July schedule — the client's own example

This is the screenshot referenced in [`../transcripts/2026-07-10-whatsapp.md`](../transcripts/2026-07-10-whatsapp.md):

> *"For example, as shown in this screenshot, the schedule for July 12th has been organized according to the tour time, number of participants, and tour type. **This grouping logic is a very important functionality**, and the same structure and information must be reflected clearly in the generated PDF export."*

**Surnames are pseudonymised** (consistent with `docs/fixtures/2026-07-12.json`). Everything else — row numbers, tour types, booked times, ages, prices, ticket groups, guide names — is verbatim. Open the workbook at row 178 to see the original.

---

## What the screenshot shows

Four colour blocks. Row 177, 191, 198 and 204 are blank separators.

### Block 1 — `Colosseo guide`, rows 178–190

Three separate bookings, **13 travellers**, split across **two ticket groups**.

| Row | N0 | Booked | Lang | Traveller | Age | Gross | Ticket group | Guide |
|---|---|---|---|---|---|---|---|---|
| 178 | 1 | 09:00 | EN | Aldridge, *lead* | Adult | 60.52 | **Group 2** — 9:45 | `Felice group 1` |
| 179 | 2 | 09:00 | | Aldridge | Adult | 60.52 | Group 2 — 9:45 | |
| 180 | 3 | 09:00 | | Aldridge | Child | 35.87 | Group 2 — 9:45 | |
| 181 | 1 | **10:00** | EN | Bramley, *lead* | Adult | 50.37 | Group 2 — 9:45 | |
| 182 | 2 | **10:00** | | Deering | Adult | 50.37 | Group 2 — 9:45 | |
| 183 | 1 | 09:00 | EN | Fairbank, *lead* | Adult | 58.32 | **Group 1** — 9:30 | |
| 184 | 2 | 09:00 | | Fairbank | Adult | 58.32 | Group 1 — 9:30 | `group 2 Carlo Maria` |
| 185 | 3 | 09:00 | | Fairbank | Adult | 58.32 | Group 1 — 9:30 | |
| 186 | 4 | 09:00 | | Fairbank | Adult | 58.32 | Group 1 — 9:30 | |
| 187 | 5 | 09:00 | | Fairbank | Adult | 58.32 | Group 1 — 9:30 | |
| 188 | 6 | 09:00 | | Fairbank | Adult | 58.32 | Group 1 — 9:30 | |
| 189 | 7 | 09:00 | | Eastwood | Adult | 58.32 | **Group 2** — 9:45 | |
| 190 | 8 | 09:00 | | Eastwood | Adult | 58.32 | **Group 2** — 9:45 | |

**This block is the entire schema argument.**

- Rows 183–190 are **one booking** — `N0` runs 1…8, and only row 183 carries a phone and a language. Yet **six travellers go to Group 1** (entry 9:30, guide Felice) and **two go to Group 2** (entry 9:45, guide Carlo Maria). *A booking splits across groups.*
- Group 2 simultaneously holds `Aldridge ×3` + `Bramley/Deering ×2` + `Eastwood ×2` = **7 travellers from three different bookings.**
- Rows 181–182 were **booked for 10:00** but placed in a group entering at **9:45**. *Booked time ≠ departure time.*
- Group sizes land on **6 and 7** — consistent with the client's *"up to 7 people"* ([`REQ-21`](../REQUIREMENTS.md)).

→ [`REQ-22`](../REQUIREMENTS.md): grouping is at **traveller** level. `travellers.groupId`, never `bookings.groupId`.

### Block 2 — `Semi-Private Colosseo`, rows 192–197

One booking, 6 travellers (4 Adult, 2 Child), booked 09:00, `Ticket done 9:00`, guide **Maria Teresa**.

`N0` reads `1, 2, 3, 3, 3, 3` — the counter is **wrong**. Hand-maintained, and drifting.

### Block 3 — `Colosseo guide`, rows 199–203

One booking, 5 travellers, booked 10:00, **language `PO`**, `Ticket done 10:15`, guide **Liliana**. Mixed surnames within a single booking.

→ A group runs in one language. Language is a grouping constraint, not a label.

### Block 4 — `Private Colosseo`, rows 205–209

One booking, 5 travellers (2 Adult @126.50, 3 Child @70.00), booked 09:00, `Ticket done 9:15`, guide `Elizabeth 2`.

---

## What this proves

| Observation | Requirement |
|---|---|
| One 8-pax booking split 6 / 2 across two groups, two guides | [`REQ-22`](../REQUIREMENTS.md) |
| One group holding 7 travellers from three bookings | [`REQ-22`](../REQUIREMENTS.md) |
| Booked 10:00, placed in the 9:45 entry group | [`REQ-25`](../REQUIREMENTS.md) |
| `Group 1 / Group 2 Ticket done 9:30 / 9:45` | [`REQ-24`](../REQUIREMENTS.md) |
| Guides `Felice`, `Carlo Maria`, `Maria Teresa`, `Liliana` — in the *description* column, not the "Name of Guide" column | [`REQ-23`](../REQUIREMENTS.md) |
| Group sizes 6 and 7 | [`REQ-21`](../REQUIREMENTS.md) |
| `PO` language block | [`REQ-27`](../REQUIREMENTS.md) |
| `N0` reading `1,2,3,3,3,3` | The Excel is decaying. This is the problem. |

The anonymised, machine-readable version of this exact day is [`../../docs/fixtures/2026-07-12.json`](../../docs/fixtures/2026-07-12.json).
