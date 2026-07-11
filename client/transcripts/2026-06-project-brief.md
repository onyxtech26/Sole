---
source: "Project Brief: Tourism Reservation Management Dashboard"
date: 2026-06 (undated; predates the 25 Jun proposal)
raw: client/raw/Project Brief.pdf
status: VERBATIM extract — do not edit or paraphrase
---

# Project Brief — Sun Tours Travels

## Introduction

> We are a tourism company that receives bookings through multiple online platforms. Approximately 90% of our reservations come from the Viator platform.
>
> Currently, all booking information is managed manually. Whenever a reservation is received through Viator, the booking details are manually entered into an Excel spreadsheet for tracking and operational management.

## Project Goal

> Develop a web-based dashboard that allows manual entry of reservation data and stores all information in a centralized database. The system should replace the current Excel-based workflow.

## Current workflow

> 1. A reservation is received through Viator.
> 2. The booking information is reviewed by an operator.
> 3. The reservation details are manually entered into an Excel file.
> 4. The stored information is used for tour operations and management.
>
> This process is time-consuming and prone to human errors.

## Main requirements

> **1. Manual Reservation Entry** — The system must allow users to manually enter reservation information. Users should be able to read reservation details from Viator emails or the Viator dashboard and enter the information into the system.
>
> **2. Centralized Data Storage** — All reservations stored in a single database. The system should support: Search · Filtering · Sorting.
>
> **3. Reservation Management** — Separate views for: Today's reservations · Upcoming · Past · Cancelled.
>
> **4. Management Dashboard** — An overview of: Daily reservations · Number of travelers · Number of tours · Reservation status.
>
> **5. Reporting** — The system must generate daily reports. Reports should be exportable as PDF files.
>
> **6. Editing Capabilities** — Users should be able to: Edit reservations · Delete reservations · Update reservation status.

## Reference files supplied

> **File 1** — Sample screenshot of a reservation received from Viator. *(I've highlighted in red the information from this reservation that needs to be entered into the system.)*
>
> **File 2** — Sample Excel file currently used for reservation management.
>
> **Reference File 3 — Available Products and Tours** — a screenshot of the products, tours, and activities currently listed on Viator… The purpose is to help the development team understand: Product and tour structure · Tour naming conventions · Service categories · The relationship between reservations and specific products · Potential filtering requirements based on tours or products.
>
> The system should be designed in a way that **each reservation can be linked to its corresponding product or tour**, allowing future reporting, statistics, and reservation management to be organized by product or tour.

## Expected deliverable

> A professional and user-friendly web dashboard that: Simplifies reservation entry · Stores all data in a centralized system · Allows efficient reservation management · Generates daily PDF reports · Replaces the current Excel-based workflow.

---

## Notes

- **"File 1"** is `client/raw/viator-booking-page-UNREDACTED.png` (page 3 of the PDF). The red highlights are the parser spec — see `docs/FAST_ENTRY.md`. It contains a real customer's name; the phone is masked on the page itself.
- **"Reference File 3"** is `client/evidence/viator-products-page{1,2}.png` — safe to commit, product names and codes only.
- The brief says reservation details may be read from *"Viator emails or the Viator dashboard."* Emails are an **unversioned, undocumented format**; the dashboard page is the stable source. See `docs/FAST_ENTRY.md`.
