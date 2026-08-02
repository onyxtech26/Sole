/* ══════════════════════════════════════════════════════════════════════════
   The only translation layer between Supabase rows and app objects.

   Two rules govern everything here:

   1. Never widen the wire format. The previous React build reads the same
      tables, so `travelers` stays an array of "Name (Adult)" strings and
      `language` stays a full language name. We parse on read and re-encode on
      write rather than changing what is stored.

   2. Never blank a column we do not own. Anything the design has no field for
      is carried through the app object untouched, so a save from this app is
      never a silent data loss for the other one.
   ══════════════════════════════════════════════════════════════════════════ */

import type {
  Booking, Customer, Expense, Guide, GuideReview, ImportBatch, Product, StaffMember,
  StoreKey, Template, TourGroup, Traveler, TravelerType,
} from '../types';

const num = (v: unknown, d = 0): number =>
  v === null || v === undefined || v === '' ? d : Number(v) || 0;
const str = (v: unknown, d = ''): string => (v === null || v === undefined ? d : String(v));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ── language: DB stores full names, the design shows two-letter codes ───── */
const LANG_CODES: Record<string, string> = {
  English: 'EN', Italian: 'IT', Spanish: 'ES', German: 'DE', French: 'FR',
  Portuguese: 'PT', Russian: 'RU', Persian: 'FA', Farsi: 'FA', Romanian: 'RO',
  Japanese: 'JA', Chinese: 'ZH', Arabic: 'AR', Dutch: 'NL', Polish: 'PL',
  Greek: 'EL', Turkish: 'TR', Hebrew: 'HE', Korean: 'KO', Swedish: 'SV',
};
const LANG_NAMES: Record<string, string> = Object.entries(LANG_CODES).reduce(
  (acc, [name, code]) => (acc[code] ? acc : Object.assign(acc, { [code]: name })),
  {} as Record<string, string>,
);

export const langToCode = (name: string): string => {
  const n = str(name).trim();
  if (!n) return 'EN';
  if (LANG_CODES[n]) return LANG_CODES[n];
  if (n.length <= 3) return n.toUpperCase();
  return n.slice(0, 2).toUpperCase();
};
export const codeToLang = (code: string): string => {
  const c = str(code).trim().toUpperCase();
  return LANG_NAMES[c] || (c ? c : 'English');
};

/* ── travellers: "Kanchan Das (Adult)" <-> ["Kanchan Das", "Adult"] ─────── */
const TRAVELER_RE = /^(.*?)\s*\((adult|child)\)\s*$/i;

function parseTravelers(row: any): Traveler[] {
  const names = arr<string>(row.travelers).map(v => str(v));
  const types = arr<string>(row.traveler_types).map(v => str(v));
  const adults = num(row.pax_adults, names.length);

  return names.map((raw, i): Traveler => {
    const m = TRAVELER_RE.exec(raw);
    if (m) return [m[1].trim(), (m[2].toLowerCase() === 'child' ? 'Child' : 'Adult') as TravelerType];
    // No suffix on the string: fall back to the explicit column, then to the
    // adult/child head-count (imports list adults first).
    const t = types[i];
    if (t === 'Adult' || t === 'Child') return [raw.trim(), t];
    return [raw.trim(), i < adults ? 'Adult' : 'Child'];
  });
}

const encodeTravelers = (list: Traveler[]): string[] =>
  list.map(([name, type]) => `${name} (${type})`);

/* ── payment wording ────────────────────────────────────────────────────────
   The column's vocabulary predates the design's. Rather than rewrite existing
   rows, translate: 'Partially Paid' <-> 'Partly paid' and 'Refunded' <->
   'Full refund'. 'Partial Refund' is the one value that is the same on both
   sides, because it was added for this build.                               */
const PAY_FROM_ROW: Record<string, Booking['payment']> = {
  'Partially Paid': 'Partly paid',
  Refunded: 'Full refund',
  'Partial Refund': 'Partial refund',
};
const PAY_TO_ROW: Record<string, string> = {
  'Partly paid': 'Partially Paid',
  'Full refund': 'Refunded',
  'Partial refund': 'Partial Refund',
};

const payFromRow = (v: string): Booking['payment'] =>
  PAY_FROM_ROW[v] ?? ((v || 'Unpaid') as Booking['payment']);
const payToRow = (v: Booking['payment']): string =>
  PAY_TO_ROW[v] ?? (v || 'Unpaid');

/* ── Booking ────────────────────────────────────────────────────────────── */
export const bookingFromRow = (r: any): Booking => {
  const travelers = parseTravelers(r);
  const wf = arr<number>(r.workflow).map(v => (v ? 1 : 0));
  return {
    ref: str(r.booking_ref),
    code: str(r.product_code),
    tg: str(r.tour_grade_code) || 'TG1',
    date: str(r.travel_date),
    resTime: str(r.res_time),
    tourTime: str(r.tour_time),
    lang: langToCode(str(r.language, 'English')),
    guide: str(r.assigned_guide),
    phone: str(r.phone),
    travelers,
    gross: num(r.amount),
    spent: num(r.spent),
    refundPct: num(r.refund_pct),
    wf: [0, 1, 2, 3].map(i => wf[i] ?? 0),
    status: (str(r.status, 'Confirmed') as Booking['status']),
    payment: payFromRow(str(r.payment_status)),
    notes: str(r.notes),
    namesLocked: !!r.names_locked,
    source: (str(r.source, 'manual') as Booking['source']),

    tourName: str(r.tour_name),
    tgTitle: str(r.tour_grade_title),
    meetingPoint: str(r.meeting_point),
    currency: str(r.currency, 'EUR'),
    leadTraveler: str(r.lead_traveler) || (travelers[0] ? travelers[0][0] : ''),
    assignedDriver: str(r.assigned_driver, 'None'),
    okStatus: !!r.ok_status,
    checkedIn: arr<number>(r.checked_in_guests).map(Number),
    namesComplete: !!r.names_complete,
    serviceLineItems: Array.isArray(r.service_line_items) ? r.service_line_items : null,
  };
};

export const bookingToRow = (b: Booking): any => ({
  booking_ref: b.ref,
  product_code: b.code,
  tour_grade_code: b.tg,
  travel_date: b.date || null,
  res_time: b.resTime ?? '',
  tour_time: b.tourTime ?? '',
  language: codeToLang(b.lang),
  assigned_guide: b.guide ?? '',
  phone: b.phone ?? '',
  travelers: encodeTravelers(b.travelers),
  traveler_types: b.travelers.map(t => t[1]),
  pax_adults: b.travelers.filter(t => t[1] === 'Adult').length,
  pax_children: b.travelers.filter(t => t[1] === 'Child').length,
  amount: b.gross ?? 0,
  spent: b.spent ?? 0,
  refund_pct: b.refundPct ?? 0,
  workflow: b.wf ?? [0, 0, 0, 0],
  status: b.status,
  payment_status: payToRow(b.payment),
  notes: b.notes || null,
  names_locked: !!b.namesLocked,
  source: b.source ?? 'manual',

  tour_name: b.tourName ?? '',
  tour_grade_title: b.tgTitle ?? '',
  meeting_point: b.meetingPoint ?? '',
  currency: b.currency || 'EUR',
  lead_traveler: b.leadTraveler || (b.travelers[0] ? b.travelers[0][0] : ''),
  assigned_driver: b.assignedDriver || 'None',
  ok_status: !!b.okStatus,
  checked_in_guests: b.checkedIn ?? [],
  names_complete: !!b.namesComplete,
  service_line_items: b.serviceLineItems ?? null,
});

/* ── Product ────────────────────────────────────────────────────────────── */
export const productFromRow = (r: any): Product => ({
  code: str(r.code),
  name: str(r.name),
  label: str(r.label),
  defaultCap: num(r.default_cap, 7),
  options: arr<any>(r.grades).map(g => ({
    tg: str(g.code) || 'TG1',
    title: str(g.name),
    cap: num(g.capacity, num(r.default_cap, 7)),
  })),
  image: str(r.image),
});

export const productToRow = (p: Product): any => ({
  code: p.code,
  name: p.name,
  label: p.label,
  default_cap: p.defaultCap ?? 7,
  grades: p.options.map(o => ({ code: o.tg, name: o.title, capacity: o.cap })),
  image: p.image ?? '',
});

/* ── Guide / Staff (one table, split by the `role` column) ──────────────── */
const availFromRow = (v: string): Guide['avail'] =>
  v === 'On Break' ? 'On break' : ((v || 'Active') as Guide['avail']);
const availToRow = (v: Guide['avail']): string => (v === 'On break' ? 'On Break' : v || 'Active');

/** Reviews are the source of truth for a guide's score; the stored
    performance_rating is the average we keep in step for the other build. */
const reviewsFromRow = (v: unknown): GuideReview[] =>
  arr<any>(v).map(x => ({
    id: str(x.id) || `rv-${str(x.date)}-${num(x.rating)}`,
    date: str(x.date),
    rating: Math.min(5, Math.max(1, num(x.rating, 5))),
    note: str(x.note),
    by: str(x.by),
  }));

export const averageRating = (reviews: GuideReview[], fallback = 5): number => {
  if (!reviews.length) return fallback;
  const sum = reviews.reduce((n, r) => n + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
};

export const guideFromRow = (r: any): Guide => {
  const reviews = reviewsFromRow(r.reviews);
  return {
    id: str(r.id),
    name: str(r.name),
    phone: str(r.phone),
    langs: arr<string>(r.languages).map(l => langToCode(str(l))).join(' · '),
    skills: arr<string>(r.skills).join(', '),
    rating: averageRating(reviews, num(r.performance_rating, 5)),
    avail: availFromRow(str(r.availability)),
    image: str(r.image),
    reviews,
  };
};

export const guideToRow = (g: Guide): any => ({
  id: g.id,
  name: g.name,
  role: 'Guide',
  phone: g.phone ?? '',
  languages: splitList(g.langs).map(codeToLang),
  skills: splitList(g.skills),
  // Kept in step with the reviews so anything reading the column alone still
  // sees the right number.
  performance_rating: averageRating(g.reviews ?? [], g.rating ?? 5),
  availability: availToRow(g.avail),
  image: g.image ?? '',
  job_title: '',
  reviews: g.reviews ?? [],
});

export const staffFromRow = (r: any): StaffMember => ({
  id: str(r.id),
  name: str(r.name),
  role: str(r.job_title) || 'Operations',
  phone: str(r.phone),
  duties: arr<string>(r.skills).join(', '),
  image: str(r.image),
  langs: arr<string>(r.languages).map(l => langToCode(str(l))).join(' · '),
  rating: num(r.performance_rating, 5),
  avail: availFromRow(str(r.availability)),
});

export const staffToRow = (s: StaffMember): any => ({
  id: s.id,
  name: s.name,
  role: 'Staff',
  phone: s.phone ?? '',
  skills: splitList(s.duties),
  image: s.image ?? '',
  job_title: s.role ?? '',
  // Carried through, not invented — see the note on StaffMember.
  languages: splitList(s.langs).map(codeToLang),
  performance_rating: s.rating ?? 5,
  availability: availToRow(s.avail ?? 'Active'),
});

/** Split a human-typed list on commas or the middot the design uses. */
export function splitList(v: string): string[] {
  return str(v)
    .split(/[,·]/)
    .map(x => x.trim())
    .filter(Boolean);
}

/* ── Schedule group ─────────────────────────────────────────────────────── */
export const groupFromRow = (r: any): TourGroup => ({
  id: str(r.id),
  date: str(r.service_date),
  code: str(r.product_code),
  tg: str(r.product_option_code) || 'TG1',
  time: str(r.departure_time),
  ticketTime: str(r.ticket_time),
  ticketStatus: str(r.ticket_status, 'Pending'),
  guide: str(r.guide_name),
  cap: num(r.capacity, 7),
  notes: str(r.notes),
  members: arr<string>(r.traveler_ids).map(v => str(v)),
  tourName: str(r.tour_name),
});

export const groupToRow = (g: TourGroup): any => ({
  id: g.id,
  service_date: g.date || null,
  product_code: g.code ?? '',
  product_option_code: g.tg || 'TG1',
  departure_time: g.time ?? '',
  ticket_time: g.ticketTime ?? '',
  ticket_status: g.ticketStatus || 'Pending',
  guide_name: g.guide || null,
  capacity: g.cap ?? 7,
  notes: g.notes ?? '',
  traveler_ids: g.members ?? [],
  tour_name: g.tourName ?? '',
});

/* ── Expense ────────────────────────────────────────────────────────────── */
export const expenseFromRow = (r: any): Expense => ({
  id: str(r.id),
  cat: (str(r.category, 'Other') as Expense['cat']),
  customCat: str(r.custom_category),
  amount: num(r.amount),
  date: str(r.date),
  desc: str(r.description),
  status: (str(r.status, 'Approved') as Expense['status']),
  receiptUrl: str(r.receipt_url),
});

export const expenseToRow = (e: Expense): any => ({
  id: e.id,
  category: e.cat,
  custom_category: e.customCat || null,
  amount: e.amount ?? 0,
  date: e.date || null,
  description: e.desc ?? '',
  status: e.status || 'Approved',
  receipt_url: e.receiptUrl || null,
});

/* ── WhatsApp template ──────────────────────────────────────────────────── */
export const templateFromRow = (r: any): Template => ({
  id: str(r.id),
  stage: num(r.stage),
  name: str(r.title),
  when: str(r.when_label),
  en: str(r.en),
  es: str(r.es),
  it: str(r.it),
});

export const templateToRow = (t: Template, i = 0): any => ({
  id: t.id,
  title: t.name ?? '',
  stage: t.stage ?? 0,
  when_label: t.when ?? '',
  en: t.en ?? '',
  es: t.es ?? '',
  it: t.it ?? '',
  sort: i,
});

/* ── Customer ───────────────────────────────────────────────────────────── */
export const customerFromRow = (r: any): Customer => ({
  id: str(r.id),
  name: str(r.name),
  email: str(r.email),
  phone: str(r.phone),
  country: str(r.country),
  trips: num(r.travel_history_count),
  preferences: arr<string>(r.preferences).map(v => str(v)),
  documents: arr<any>(r.documents).map(d => ({
    name: str(d.name), type: str(d.type), url: d.url ? str(d.url) : undefined,
  })),
  notes: str(r.notes),
  journey: arr<any>(r.journey).map(j => ({
    date: str(j.date), title: str(j.title), description: str(j.description),
  })),
});

export const customerToRow = (c: Customer): any => ({
  id: c.id,
  name: c.name,
  email: c.email ?? '',
  phone: c.phone ?? '',
  country: c.country ?? '',
  travel_history_count: c.trips ?? 0,
  preferences: c.preferences ?? [],
  documents: c.documents ?? [],
  notes: c.notes ?? '',
  journey: c.journey ?? [],
});

/* ── Import batch ───────────────────────────────────────────────────────── */
export const importBatchFromRow = (r: any): ImportBatch => ({
  id: str(r.id),
  fileName: str(r.file_name),
  fileSize: num(r.file_size),
  importedAt: str(r.imported_at),
  importedBy: str(r.imported_by),
  importedByName: str(r.imported_by_name),
  rowsTotal: num(r.rows_total),
  rowsAdded: num(r.rows_added),
  rowsUpdated: num(r.rows_updated),
  rowsUnchanged: num(r.rows_unchanged),
  rowsCancelled: num(r.rows_cancelled),
  rowsInvalid: num(r.rows_invalid),
  source: str(r.source, 'viator'),
});

export const importBatchToRow = (b: ImportBatch): any => ({
  id: b.id,
  file_name: b.fileName ?? '',
  file_size: b.fileSize ?? 0,
  imported_at: b.importedAt || new Date().toISOString(),
  // A guide's profile row can disappear; the log entry must not follow it.
  imported_by: b.importedBy || null,
  imported_by_name: b.importedByName ?? '',
  rows_total: b.rowsTotal ?? 0,
  rows_added: b.rowsAdded ?? 0,
  rows_updated: b.rowsUpdated ?? 0,
  rows_unchanged: b.rowsUnchanged ?? 0,
  rows_cancelled: b.rowsCancelled ?? 0,
  rows_invalid: b.rowsInvalid ?? 0,
  source: b.source || 'viator',
});

/* ── registry ───────────────────────────────────────────────────────────── */
export interface EntityConfig<T = any> {
  table: string;
  pk: string;
  pkOf: (o: T) => string;
  fromRow: (row: any) => T;
  toRow: (o: T, index: number) => any;
  orderBy?: string;
  /** Only rows matching this survive the read (guides vs staff share a table). */
  rowFilter?: (row: any) => boolean;
}

export const ENTITIES: Record<StoreKey, EntityConfig> = {
  bookings: {
    table: 'bookings', pk: 'booking_ref', pkOf: (b: Booking) => b.ref,
    fromRow: bookingFromRow, toRow: bookingToRow, orderBy: 'travel_date',
  },
  products: {
    table: 'products', pk: 'code', pkOf: (p: Product) => p.code,
    fromRow: productFromRow, toRow: productToRow, orderBy: 'created_at',
  },
  guides: {
    table: 'guides', pk: 'id', pkOf: (g: Guide) => g.id,
    fromRow: guideFromRow, toRow: guideToRow, orderBy: 'id',
    rowFilter: r => r.role !== 'Staff',
  },
  staff: {
    table: 'guides', pk: 'id', pkOf: (s: StaffMember) => s.id,
    fromRow: staffFromRow, toRow: staffToRow, orderBy: 'id',
    rowFilter: r => r.role === 'Staff',
  },
  groups: {
    table: 'schedule_groups', pk: 'id', pkOf: (g: TourGroup) => g.id,
    fromRow: groupFromRow, toRow: groupToRow, orderBy: 'created_at',
  },
  expenses: {
    table: 'expenses', pk: 'id', pkOf: (e: Expense) => e.id,
    fromRow: expenseFromRow, toRow: expenseToRow, orderBy: 'date',
  },
  templates: {
    table: 'whatsapp_templates', pk: 'id', pkOf: (t: Template) => t.id,
    fromRow: templateFromRow, toRow: templateToRow, orderBy: 'sort',
  },
  customers: {
    table: 'customers', pk: 'id', pkOf: (c: Customer) => c.id,
    fromRow: customerFromRow, toRow: customerToRow, orderBy: 'created_at',
  },
  imports: {
    table: 'import_batches', pk: 'id', pkOf: (b: ImportBatch) => b.id,
    fromRow: importBatchFromRow, toRow: importBatchToRow, orderBy: 'imported_at',
  },
};

export const STORE_KEYS = Object.keys(ENTITIES) as StoreKey[];

/** Which store keys a realtime change on `table` should refetch. */
export const KEYS_FOR_TABLE = (table: string): StoreKey[] =>
  STORE_KEYS.filter(k => ENTITIES[k].table === table);
