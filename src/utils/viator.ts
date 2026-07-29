/* ══════════════════════════════════════════════════════════════════════════
   Viator reservations export → bookings.

   The export is Italian and only ever names the lead passenger; the rest of the
   party arrives as head-counts. Everything here is a straight port of the
   handoff's reader, with two changes: SheetJS is bundled (lazily imported)
   rather than pulled from a CDN, and the output matches the Booking type.
   ══════════════════════════════════════════════════════════════════════════ */

import type { Booking, Traveler } from '../types';
import { iso } from './dates';

const COL = {
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

const LANG_MAP: Record<string, string> = {
  inglese: 'EN', spagnolo: 'ES', italiano: 'IT', francese: 'FR', tedesco: 'DE',
  portoghese: 'PT', olandese: 'NL', russo: 'RU', cinese: 'ZH', giapponese: 'JA',
  arabo: 'AR', coreano: 'KO', greco: 'EL', polacco: 'PL', turco: 'TR',
};

type Row = Record<string, unknown>;
const cell = (v: unknown): string => (v == null ? '' : String(v));

function translateStatus(raw: unknown): Booking['status'] {
  const s = cell(raw).trim().toLowerCase();
  if (s.startsWith('conferm')) return 'Confirmed';
  if (s.startsWith('modific')) return 'Modified';
  if (s.startsWith('cancell') || s.startsWith('annull')) return 'Cancelled';
  return 'Confirmed';
}

function translateLanguage(raw: unknown): string {
  const s = cell(raw).trim();
  if (!s) return 'EN';
  return LANG_MAP[s.toLowerCase()] || s.slice(0, 2).toUpperCase();
}

function cellToDate(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    // SheetJS drifts a few seconds around local midnight on pure date cells.
    return iso(new Date(v.getTime() + 12 * 3600 * 1000));
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/); // dd/mm/yyyy (Italian)
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : iso(d);
}

function extractTime(gradeCode: unknown, gradeTitle: unknown): string {
  const gc = cell(gradeCode);
  const tilde = gc.indexOf('~');
  if (tilde !== -1) {
    const m = gc.slice(tilde + 1).match(/(\d{1,2}):(\d{2})/);
    if (m) return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
  }
  const t = cell(gradeTitle).match(/(\d{1,2}):(\d{2})/);
  return t ? `${String(t[1]).padStart(2, '0')}:${t[2]}` : '';
}

function gradeCodeOnly(gradeCode: unknown): string {
  const gc = cell(gradeCode).trim();
  const i = gc.indexOf('~');
  return (i === -1 ? gc : gc.slice(0, i).trim()) || 'TG1';
}

function intOf(v: unknown): number {
  const n = parseInt(cell(v).replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/** Placeholder names ops has not replaced with passport names yet. */
export function isPlaceholderName(name: string): boolean {
  const n = String(name || '').trim();
  if (!n) return true;
  return /^(Guest|Traveller|Traveler|Child)\s+\d+$/i.test(n);
}

function buildTravelers(lead: unknown, adults: number, children: number): Traveler[] {
  const list: Traveler[] = [[cell(lead).trim() || 'Lead traveller', 'Adult']];
  for (let i = 2; i <= adults; i++) list.push([`Guest ${i}`, 'Adult']);
  for (let i = 1; i <= children; i++) list.push([`Child ${i}`, 'Child']);
  return list;
}

export interface RowResult {
  booking: Booking | null;
  reason?: 'cancelled' | 'invalid';
}

export function rowToBooking(row: Row): RowResult {
  const ref = cell(row[COL.ref]).trim();
  if (!ref) return { booking: null, reason: 'invalid' };

  const status = translateStatus(row[COL.status]);
  if (status === 'Cancelled') return { booking: null, reason: 'cancelled' };

  const date = cellToDate(row[COL.travelDate]);
  if (!date) return { booking: null, reason: 'invalid' };

  let adults = intOf(row[COL.adults]);
  const children = intOf(row[COL.children]);
  if (adults <= 0 && children <= 0) adults = 1;
  if (adults < 0) adults = 0;

  const travelers = buildTravelers(row[COL.lead], adults, children);

  return {
    booking: {
      ref,
      code: cell(row[COL.productCode]).trim(),
      tg: gradeCodeOnly(row[COL.gradeCode]),
      date,
      resTime: extractTime(row[COL.gradeCode], row[COL.gradeTitle]),
      tourTime: '',                    // ops fills this in after grouping
      lang: translateLanguage(row[COL.language]),
      guide: '',
      phone: cell(row[COL.contact]).replace(/\.0$/, '').trim(),
      travelers,
      gross: Number(row[COL.price]) || 0,
      spent: 0,
      wf: [0, 0, 0, 0],
      status,
      payment: 'Paid',                 // Viator collects up front; this is the payout
      notes: '',
      namesLocked: false,
      source: 'viator_import',

      tourName: cell(row[COL.productName]).trim(),
      tgTitle: cell(row[COL.gradeTitle]).trim(),
      meetingPoint: '',
      currency: 'EUR',
      leadTraveler: travelers[0][0],
      assignedDriver: 'None',
      okStatus: status === 'Confirmed',
      checkedIn: [],
      namesComplete: false,
      serviceLineItems: null,
    },
  };
}

/** Refresh report-sourced fields without destroying anything ops typed by hand. */
export function mergeForImport(incoming: Booking, existing?: Booking): Booking {
  if (!existing) return incoming;
  const paxSame = existing.travelers.length === incoming.travelers.length;
  return {
    ...existing,
    code: incoming.code,
    tg: incoming.tg,
    date: incoming.date,
    resTime: incoming.resTime || existing.resTime,
    lang: incoming.lang,
    gross: incoming.gross,
    status: incoming.status,
    tourName: incoming.tourName,
    tgTitle: incoming.tgTitle,
    travelers: paxSame ? existing.travelers : incoming.travelers,
    source: 'viator_import',
  };
}

/** Minimal RFC-4180 reader that also copes with the semicolon-delimited variant. */
export function parseDelimited(text: string): Row[] {
  const s = String(text || '').replace(/^﻿/, '');
  const firstLine = s.split(/\r?\n/)[0] || '';
  const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return [];

  const head = rows[0].map(h => String(h).trim());
  return rows
    .slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const o: Row = {};
      head.forEach((h, i) => { o[h] = r[i] == null ? '' : String(r[i]).trim(); });
      return o;
    });
}

export interface ImportResult {
  incoming: Booking[];
  cancelled: number;
  invalid: number;
  total: number;
}

/** Read a Viator export (.xlsx / .xls / .csv) into candidate bookings. */
export async function readViatorFile(file: File): Promise<ImportResult> {
  let rows: Row[];

  if (/\.csv$/i.test(file.name)) {
    rows = parseDelimited(await file.text());
  } else {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = ws ? XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: true }) : [];
  }

  if (!rows.length) throw new Error('That file has no rows.');
  if (!(COL.ref in rows[0])) {
    throw new Error(
      'This does not look like a Viator export. The first row must contain the Italian column “Numero di prenotazione”.',
    );
  }

  let cancelled = 0;
  let invalid = 0;
  const incoming: Booking[] = [];

  for (const r of rows) {
    const out = rowToBooking(r);
    if (out.booking) incoming.push(out.booking);
    else if (out.reason === 'cancelled') cancelled++;
    else invalid++;
  }

  return { incoming, cancelled, invalid, total: rows.length };
}
