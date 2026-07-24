// Shared Viator (Italian) bookings-report transform.
//
// The report is an .xlsx/.csv exported from Viator in Italian. The client only
// wants the green-highlighted columns, Cancelled rows dropped, Italian values
// translated to English, and daily re-imports to upsert by booking reference
// while preserving passenger names that staff filled in by hand.
//
// This module is intentionally pure (no Supabase / DOM) so it can run both in
// the browser importer and in the tsx seed script.

import { Booking } from '../types';

// Italian column headers (exactly as they appear in row 1 of the report).
export const COL = {
  ref: 'Numero di prenotazione',
  price: 'Prezzo netto',
  status: 'Stato',
  travelDate: 'Data di viaggio',
  lead: 'Nome viaggiatore principale',
  contact: 'Contatti viaggiatore principale',
  adults: 'Adulti',
  children: 'Bambini',
  productCode: 'Codice prodotto',
  productName: 'Nome prodotto',
  gradeCode: 'Codice livello del tour',
  gradeTitle: 'Titolo livello del tour',
  language: 'Lingua del tour',
} as const;

// Status: Confermata -> Confirmed, Modificata -> Modified, Cancellata -> Cancelled
export function translateStatus(raw: any): Booking['status'] {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.startsWith('conferm')) return 'Confirmed';
  if (s.startsWith('modific')) return 'Modified';
  if (s.startsWith('cancell') || s.startsWith('annull')) return 'Cancelled';
  if (s.startsWith('in attesa') || s.startsWith('attesa') || s.startsWith('pend')) return 'Pending';
  return 'Confirmed';
}

const LANG_MAP: Record<string, string> = {
  inglese: 'English', spagnolo: 'Spanish', italiano: 'Italian', francese: 'French',
  tedesco: 'German', portoghese: 'Portuguese', olandese: 'Dutch', russo: 'Russian',
  cinese: 'Chinese', giapponese: 'Japanese', arabo: 'Arabic', coreano: 'Korean',
  greco: 'Greek', polacco: 'Polish', turco: 'Turkish',
};
export function translateLanguage(raw: any): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'English';
  const key = s.toLowerCase();
  if (LANG_MAP[key]) return LANG_MAP[key];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Report travel-date cell may be a JS Date (cellDates:true) or a string.
export function toDateStr(v: any): string {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    // SheetJS parses date cells with a few seconds of float drift around local
    // midnight (e.g. Aug 1 arrives as "Jul 31 23:59:35"). These cells are pure
    // calendar dates, so snap to the nearest day by nudging +12h before reading
    // the local components. Works in any timezone.
    const t = new Date(v.getTime() + 12 * 3600 * 1000);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/); // dd/mm/yyyy (Italian)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : toDateStr(d);
}

// Extract "HH:MM" from a grade code like "TG4~14:00" or a title "... 14:00".
export function extractTime(gradeCode: any, gradeTitle: any): string {
  const gc = String(gradeCode ?? '');
  const tildeIdx = gc.indexOf('~');
  if (tildeIdx !== -1) {
    const after = gc.slice(tildeIdx + 1).trim();
    const m = after.match(/(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  const t = String(gradeTitle ?? '').match(/(\d{1,2}):(\d{2})/);
  if (t) return `${t[1].padStart(2, '0')}:${t[2]}`;
  return '';
}

export function gradeCodeOnly(gradeCode: any): string {
  const gc = String(gradeCode ?? '').trim();
  const i = gc.indexOf('~');
  return i === -1 ? gc : gc.slice(0, i).trim();
}

// Normalise a phone-ish cell (may arrive as a number) to a plain string.
export function normalizePhone(v: any): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(Math.round(v));
  return String(v).replace(/\.0$/, '').trim();
}

const intOf = (v: any, d = 0) => {
  const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? d : n;
};

// Build the traveller manifest. The report only carries the LEAD passenger, so
// remaining seats become clearly-labelled placeholders that staff replace with
// passport names later. `namesComplete` is true only when there is nobody else
// to name (single adult, no children).
export function buildTravelers(lead: string, adults: number, children: number): { travelers: string[]; namesComplete: boolean } {
  const list: string[] = [];
  const leadName = lead.trim() || 'Lead Traveler';
  list.push(`${leadName} (Adult)`);
  for (let i = 2; i <= adults; i++) list.push(`Guest ${i} (Adult)`);
  for (let i = 1; i <= children; i++) list.push(`Child ${i} (Child)`);
  const namesComplete = adults <= 1 && children === 0;
  return { travelers: list, namesComplete };
}

// A traveller entry is a placeholder (needs a real passport name) when it is
// blank or still looks like an auto-generated "Guest 2 / Child 1 / Traveler 3".
export function isPlaceholderName(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return true;
  return /\b(Guest|Traveler|Child)\s+\d+\b/i.test(n);
}

// True when every traveller has a real (non-placeholder) name.
export function computeNamesComplete(travelers: string[]): boolean {
  if (!travelers || travelers.length === 0) return true;
  return !travelers.some(isPlaceholderName);
}

export interface RawRow { [header: string]: any }

export interface TransformResult {
  bookings: Booking[]; // Confirmed + Modified only
  skippedCancelled: number;
  skippedInvalid: number;
  total: number;
}

// Turn one raw report row into a Booking, or null if it must be skipped.
export function rowToBooking(row: RawRow): { booking: Booking | null; reason?: 'cancelled' | 'invalid' } {
  const ref = String(row[COL.ref] ?? '').trim();
  if (!ref) return { booking: null, reason: 'invalid' };

  const status = translateStatus(row[COL.status]);
  if (status === 'Cancelled') return { booking: null, reason: 'cancelled' };

  let adults = intOf(row[COL.adults], 0);
  const children = intOf(row[COL.children], 0);
  if (adults <= 0 && children <= 0) adults = 1;
  else if (adults < 0) adults = 0;

  const lead = String(row[COL.lead] ?? '').trim();
  const { travelers, namesComplete } = buildTravelers(lead, adults, children);
  const tourTime = extractTime(row[COL.gradeCode], row[COL.gradeTitle]);

  const booking: Booking = {
    bookingRef: ref,
    tourName: String(row[COL.productName] ?? '').trim(),
    productCode: String(row[COL.productCode] ?? '').trim(),
    travelDate: toDateStr(row[COL.travelDate]),
    tourTime,
    leadTraveler: lead,
    travelers,
    paxCount: { adults, children },
    phone: normalizePhone(row[COL.contact]),
    language: translateLanguage(row[COL.language]),
    meetingPoint: '',
    amount: Number(row[COL.price]) || 0,
    currency: 'EUR',
    status,
    paymentStatus: 'Paid', // Viator collects payment up-front; net price is the payout
    assignedGuide: '',
    assignedDriver: 'None',
    okStatus: status === 'Confirmed',
    checkedInGuests: [],
    namesLocked: false,
    namesComplete,
    tourGradeCode: gradeCodeOnly(row[COL.gradeCode]),
    tourGradeTitle: String(row[COL.gradeTitle] ?? '').trim(),
    source: 'viator_import',
  };
  return { booking };
}

export function transformRows(rows: RawRow[]): TransformResult {
  const bookings: Booking[] = [];
  let skippedCancelled = 0;
  let skippedInvalid = 0;
  for (const row of rows) {
    const { booking, reason } = rowToBooking(row);
    if (booking) bookings.push(booking);
    else if (reason === 'cancelled') skippedCancelled++;
    else skippedInvalid++;
  }
  return { bookings, skippedCancelled, skippedInvalid, total: rows.length };
}

// Merge an incoming (report) booking with the existing stored one so a daily
// re-import refreshes report-sourced fields but never destroys manually entered
// passenger names, guide/driver assignments, notes, payment or check-in state.
export function mergeForImport(incoming: Booking, existing?: Booking): Booking {
  if (!existing) return incoming;

  const paxSame =
    existing.paxCount.adults === incoming.paxCount.adults &&
    existing.paxCount.children === incoming.paxCount.children;

  // Keep the manually-curated traveller list when the party size is unchanged;
  // otherwise fall back to fresh placeholders for the new headcount.
  const travelers = paxSame ? existing.travelers : incoming.travelers;
  const namesComplete = paxSame ? !!existing.namesComplete : incoming.namesComplete;

  return {
    ...existing,
    // report-sourced fields (refreshed every import)
    tourName: incoming.tourName,
    productCode: incoming.productCode,
    travelDate: incoming.travelDate,
    tourTime: incoming.tourTime || existing.tourTime,
    leadTraveler: incoming.leadTraveler,
    paxCount: incoming.paxCount,
    amount: incoming.amount,
    language: incoming.language,
    status: incoming.status,
    okStatus: incoming.status === 'Confirmed',
    tourGradeCode: incoming.tourGradeCode,
    tourGradeTitle: incoming.tourGradeTitle,
    source: 'viator_import',
    travelers,
    namesComplete,
    // preserved manual fields: assignedGuide, assignedDriver, notes,
    // meetingPoint, paymentStatus, namesLocked, checkedInGuests, serviceLineItems
  };
}
