# Making Manual Entry Fast

**The client explicitly chose manual entry** and rejected a direct OTA connection (meeting notes, 7 Jul 2026: *"reza shams expressed a preference for manual data entry within the software, rejecting a direct connection to the OTA platform"*).

This is not a compromise to work around. It happens to be the only thing that was ever possible — **Viator's Supplier API is push-only and has no endpoint to list your own bookings** (see [`RESEARCH.md`](./RESEARCH.md) §3). The proposal's "paste-and-fill" feature stands exactly as sold. Only the implementation changes.

**The goal:** every field that can be derived, is derived. Every calculation staff do by hand, the system does. Staff keep the judgement; the machine takes the typing.

---

## Evidence: the two source screenshots

Extracted from `Project Brief.pdf` (pages 3 and 4). They are the same booking, and together they specify the parser.

> **Traveller names and the phone number below are pseudonymised.** The real ones are in `Project Brief.pdf`, which is gitignored — it contains a live customer's phone number. Booking reference, product code, dates, times and amounts are real, and are what the parser must handle.

### The Viator booking page (p3) — everything highlighted in red is what staff retype

```
Sun, June 28, 2026                                          [CONFIRMED]
Private guided Tour of Colosseum, Roman Forum & Palatine Hill
Private guided Tour of Colosseum, Roman Forum & Palatine Hill  09:00

Lead Traveler : Kit Fairbank            BR-1414119089
2 adults                                  Posted Jun 23, 2026, 3:58am CEST
INSTANT CONFIRMATION
Customer phone number :                   Meeting point : Caffè Roma, Via del
+1 ***-***-****   👁 Show                   Colosseo, 31a, 00184 Rome RM, Italy
Names of travellers :                     Booking Source : Viator
  Kit Fairbank ( Adult )                Product Code : 5524558P4
  Bea Fairbank ( Adult )
Tour language :                           Amount you will receive : 320.26 EUR
  English
```

### The same booking in their Excel (p4)

```
470 │ 1 │ Private Colosseo │ dom 28 giu 2026 │ 09:00 │ EN │ Kit Fairbank │ Adult │ 160,13€ │ +1 555 0114
471 │ 2 │ Private Colosseo │ dom 28 giu 2026 │ 09:00 │    │ Bea Fairbank  │ Adult │ 160,13€ │
```

**`320.26 ÷ 2 = 160.13`.** They divide the payout across travellers with a calculator. Column `S` of the July sheet still holds the scratch arithmetic (`606 / 13 = 46.6153…`).

---

## 1. Paste & Fill — one paste replaces ~25 typed fields

Staff already open the Viator booking page for every reservation. `Ctrl+A`, `Ctrl+C`, paste into one textarea, review the parsed preview, correct anything, save.

| Source text | Field | Extraction |
|---|---|---|
| `BR-1414119089` | `reference` | `/BR-\d{10}/` — also the duplicate key |
| `Product Code : 5524558P4` | `productId` | **exact match on `products.viatorCode`** |
| `Sun, June 28, 2026` | `serviceDate` | |
| `09:00` (subtitle line) | `startTime` | |
| `Names of travellers :` block | traveller rows | `Name ( Adult )` \| `( Child )` |
| `Lead Traveler : Kit Fairbank` | `isLead` | match against the names block |
| `Tour language : English` | `language` | |
| `Meeting point : …` | `meetingPoint` | |
| `Amount you will receive : 320.26 EUR` | `amountCents`, `currency` | **net payout, whole booking** |
| `Booking Source : Viator` | `source` | |
| `Posted Jun 23, 2026, 3:58am CEST` | `receivedDate` | |
| `2 adults` | — | sanity-check against the names block; warn on mismatch |

Anchor every regex on its label (`Product Code :`, `Amount you will receive :`). This is a copied **web page**, so whitespace and line order carry layout noise. Never parse positionally.

### ⚠ The phone is masked

The page renders `+1 ***-***-****` until someone clicks **Show**. A naive copy captures the mask.

**The parser must detect `***` and refuse the field**, surfacing: *"Phone is hidden — click Show on Viator and re-copy, or type it in."*

Their Excel holds the unmasked number, so staff evidently do click it. The parser must not fail silently on the day someone forgets. **Never store a masked phone.**

### Confidence, not magic

Show a parsed preview with each field marked **matched** / **guessed** / **missing**. Staff confirm before save. A parser that silently guesses wrong is worse than one that asks.

Duplicate guard: `bookings` already has a unique index on `(reference, source)`.

---

## 2. Do the arithmetic they do by hand

The Viator page gives a **booking total**. Their Excel wants **per traveller**.

- **All-adult bookings:** exactly `total ÷ pax`. Verified: `320.26 / 2 = 160.13`.
- **Mixed ages:** the child ratio is **not constant** — 85.68/164.88 = 0.52 in one booking, 35.87/60.52 = 0.59 in another. That is Viator's dynamic pricing, not a rule we can infer.

**So:** auto-split the total evenly, show the per-head figure inline, and let staff override the child band. The system does the division; the judgement stays with the human. Round to whole cents and **assign the rounding remainder to the lead traveller** so `Σ grossCents` always equals the booking total exactly.

`costCents` ("spent", ~46.61) is a per-product default staff maintain once, not per booking.

> **Open question for the client:** where do the per-age-band amounts come from for mixed bookings? Possibly a price breakdown further down the Viator page. Ask before building the override UI.

---

## 3. Product Code is the join key — but the names differ

| | |
|---|---|
| Viator name | `Private guided Tour of Colosseum, Roman Forum & Palatine Hill` |
| Their name | `Private Colosseo` |

Products need **both**: the official Viator name (for matching) and a **short operational name** (for the board and the printed manifest — a guide does not want a 60-character title on a header band).

Once `5524558P4` resolves the product, it can pre-fill **meeting point, default language, tour grade (TG1/TG2/TG3), and capacity**. One code, five fields.

The full catalogue from the brief's product screenshots — all seven already in `PRODUCT_SEEDS`:

| Code | Product | Excel alias |
|---|---|---|
| `5524558P1` | Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome | Colosseo guide |
| `5524558P4` | Private guided Tour of Colosseum, Roman Forum & Palatine Hill | Private Colosseo |
| `5524558P3` | Guided Tour for Vatican Museum and Sistin Chapel | |
| `5524558P2` | Rome Highlights by Golf Cart Tour | |
| `5524558P10` | Discover North Cyprus: Private Famagusta Tour | |
| `5524558P18` | Rome Photo Shoot with Professional Photographer | |
| `5524558P19` | Private Guided Walking Tour of Rome's City Highlights | |

`Semi-Private Colosseo`, `Just Colosseo`, `Arena Ticket + Virtual Tour` etc. do not appear in the product list — they are almost certainly **sub-products (tour grades)** under a parent product. Confirm with the client which parent each sits under.

---

## 4. The second entry event — and it's the expensive one

Viator supplies names like `Kit Fairbank`. **The Colosseum checks names against photo ID at the gate** ([`RESEARCH.md`](./RESEARCH.md) §2).

That mismatch is exactly why their WhatsApp template asks travellers to *"send the name of each passenger exactly as it appears on their identification documents"* plus *"Date of Birth (only required for travellers under 18)"*. Those replies arrive **days later, as free text**, and get typed in a second time.

**So the booking page needs a second paste box:** paste the WhatsApp reply → update traveller names → set `dateOfBirth` → auto-derive Adult/Child from age.

This is the entry event nobody planned for, and it touches every booking.

---

## 5. Smaller accelerators, all cheap

- **Multi-line paste explodes into rows.** Paste 6 names into the first name field → 6 traveller rows.
- **Surname inheritance.** After the first traveller, pre-fill the last name. Families dominate (`Fairbank ×6`, `Hensley ×6`, `Castellan ×5`).
- **`( Adult )` / `( Child )` parsed from the name line**; DOB overrides it when supplied.
- **Product defaults:** meeting point, language, cost-per-traveller, tour grade, capacity.
- **Keyboard-first:** `Enter` adds a traveller row; tab order follows the Viator page's reading order so eyes never jump.
- **Draft autosave** — a half-entered booking survives a refresh.
- **After save → "Add to a group"**, jumping straight to the schedule board for that date.
- **`Cmd/Ctrl+V` anywhere on `/bookings/new`** opens the paste box. No hunting for it.

---

## What this is *not*

- **Not an API integration.** No credentials, no webhooks, no certification, nothing to break when Viator changes.
- **Not email scraping.** Viator's notification email format is undocumented and unversioned; treat it as a "go look" ping, never as structured data.
- **Not OCR.** It is a text copy from a page staff already have open.

If the client ever *does* want bulk intake, the honest option is the **Extranet CSV export** (`supplier.viator.com` → Bookings → export). That is still manual — a human downloads a file and uploads it — so it respects their stated preference, while handling a month in one action. Worth offering; export one real CSV first, because the column schema is unverified.

---

## Build order

1. **Paste & Fill parser** + preview + phone-mask guard. Biggest single win.
2. **Per-traveller amount auto-split** from the booking total, with an editable child band.
3. **Product short name** + product-driven defaults.
4. **WhatsApp name/DOB paste box** on the booking.
5. Multi-line name paste, surname inheritance, keyboard flow.

Steps 1 and 2 alone remove most of the typing **and** the calculator.

## Verification

Parse the real booking from `Project Brief.pdf` p3 and assert:

```
reference    BR-1414119089
product      5524558P4
serviceDate  2026-06-28
startTime    09:00
travellers   Kit Fairbank (Adult, lead), Bea Fairbank (Adult)
language     English
amount       32026 cents EUR
per-traveller 16013 cents each          ← 320.26 ÷ 2, matches their Excel exactly
phone        REJECTED — masked
```

That single booking is a complete end-to-end fixture: it appears in both the Viator page **and** their Excel, so the parser's output can be diffed against what a human actually produced.
