# `client/` — What the client actually said

This folder is the **source of truth**. `docs/` interprets it; this records it.

## The rule

> **`client/` is append-only and verbatim. `docs/` is where we think.**

Never paraphrase inside a transcript. Never "clean up" the client's wording. When a decision in `docs/` needs justifying, it must point at a line in here — and if it can't, it is *our* decision, and must be labelled as such.

This is the mechanism that stops a plausible-sounding assumption from hardening into "the client confirmed it." That has already happened once: `docs/PRODUCT_VISION.md` claimed the client confirmed EUR-only. He never answered the question.

## Layout

```
client/
  README.md            ← you are here
  REQUIREMENTS.md      ← the register. Every requirement, an ID, a source, a status
  transcripts/         ← verbatim. Never edited
    2026-06-project-brief.md
    2026-07-07-meeting.md
    2026-07-10-whatsapp.md      ← the newest and most specific requirements
  evidence/            ← committed. Safe to share. No personal data
    viator-products-page1.png
    viator-products-page2.png
  raw/                 ← GITIGNORED. Originals, with real customer data
```

## Status vocabulary — read `REQUIREMENTS.md` with this in mind

| | |
|---|---|
| 🟢 CONFIRMED | The client said it. There is a quote. |
| 🟡 DERIVED | We inferred it from their data or from Italian law. Cited, defensible — **but they never said it.** |
| 🔴 OPEN | Unknown. **Ask.** Do not guess, do not build. |

Six requirements are 🔴 OPEN. Two of them are questions we asked the client on WhatsApp that **he simply did not answer** — guides/payment tracking, and currency. We made those calls ourselves. Present them as ours.

## `raw/` — do not commit

Gitignored, deliberately. Place these here manually; get them from a teammate over a private channel:

| File | Contains |
|---|---|
| `July 2026.xlsx` | **363 real travellers: full names + phone numbers.** Also the hidden `Print 5 oct` sheet — the PDF spec |
| `Project Brief.pdf` | Includes a real booking (page 3) and real Excel rows (page 4) |
| `viator-booking-page-UNREDACTED.png` | Page 3 extracted. A real customer's name; phone is masked on the page itself |
| `excel-rows-UNREDACTED.png` | Page 4 extracted. Real names **and unmasked phone numbers** |
| `project proposal.pdf` | ⚠ **Deleted, and never committed. No copy exists in git.** Pricing, package tiers, and the paste-and-fill commitment were in it |

Everything load-bearing in those files is transcribed, redacted, into `transcripts/` and `docs/`. You can build the whole system without opening any of them. You will want the workbook's `Print 5 oct` sheet in front of you to *verify* the PDF.

## Using this in Claude Code

`CLAUDE.md` loads automatically and points here. When you start a task:

1. Read `REQUIREMENTS.md` and find the REQ-ID you are implementing.
2. If it is 🟡 **DERIVED**, read the evidence column and satisfy yourself it holds.
3. If it is 🔴 **OPEN**, stop. Ask the client. Do not pick the plausible answer.
4. When you write code or a doc that depends on a requirement, **cite the REQ-ID**, so the next person can trace it back to a sentence someone actually said.

Anonymised test data lives at `docs/fixtures/2026-07-12.json` — the canonical day, safe to commit, structurally real.
