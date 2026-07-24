// Browser-side reading of a Viator bookings report (.xlsx / .xls / .csv).
// Parsing lives here; the pure row->Booking transform lives in viatorImport.ts
// so it can be shared with the tsx seed script.
import * as XLSX from 'xlsx';
import { Booking } from '../types';
import { COL, transformRows, mergeForImport, RawRow } from './viatorImport';

export async function readReportRows(file: File): Promise<RawRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '', raw: true });
}

export interface ImportOutcome {
  toUpsert: Booking[];
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCancelled: number;
  skippedInvalid: number;
  total: number;
}

// Parse + transform a file against the currently-loaded bookings, returning the
// merged records to upsert (manual passenger names/guides preserved) plus stats.
export async function planImport(file: File, existing: Booking[]): Promise<ImportOutcome> {
  const rows = await readReportRows(file);
  if (rows.length === 0) throw new Error('The file appears to be empty.');
  if (!(COL.ref in rows[0])) {
    throw new Error(
      'This does not look like a Viator report. Expected the Italian column "Numero di prenotazione" in the first row.'
    );
  }

  const { bookings, skippedCancelled, skippedInvalid, total } = transformRows(rows);
  const byRef = new Map(existing.map(b => [b.bookingRef, b]));

  let newCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const toUpsert: Booking[] = [];

  for (const incoming of bookings) {
    const prev = byRef.get(incoming.bookingRef);
    const merged = mergeForImport(incoming, prev);
    if (!prev) newCount++;
    else if (JSON.stringify(prev) === JSON.stringify(merged)) unchangedCount++;
    else updatedCount++;
    toUpsert.push(merged);
  }

  return { toUpsert, newCount, updatedCount, unchangedCount, skippedCancelled, skippedInvalid, total };
}
