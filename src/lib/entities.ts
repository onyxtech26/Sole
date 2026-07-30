// Central registry mapping each legacy localStorage key to a Supabase table,
// with row<->object mappers (snake_case columns <-> camelCase app objects).
// The hybrid store (utils/storage.ts) and the seed script both use this so the
// mapping lives in exactly one place.

import { Booking, GuideProfile, Customer, Expense, ImportBatch } from '../types';
import type { Product } from '../components/ProductsView';
import type { WhatsappTemplate } from '../utils/whatsappTemplates';

export interface EntityConfig<T = any> {
  table: string;
  pk: string; // primary-key column name (snake_case)
  pkOf: (obj: T) => string; // primary key value from an app object
  fromRow: (row: any) => T;
  toRow: (obj: T, index?: number) => any;
  orderBy?: string;
}

const num = (v: any, d = 0) => (v === null || v === undefined || v === '' ? d : Number(v));

// The four message-workflow flags are always stored as a length-4 array of 0/1,
// so a short or malformed row can never make the table render a ragged column.
export const normalizeWorkflow = (v: any): number[] => {
  const src = Array.isArray(v) ? v : [];
  return [0, 1, 2, 3].map(i => (src[i] ? 1 : 0));
};

// ---- Booking ----
export const bookingFromRow = (r: any): Booking => ({
  bookingRef: r.booking_ref,
  tourName: r.tour_name ?? '',
  productCode: r.product_code ?? '',
  travelDate: r.travel_date ?? '',
  tourTime: r.tour_time ?? '',
  leadTraveler: r.lead_traveler ?? '',
  travelers: Array.isArray(r.travelers) ? r.travelers : [],
  paxCount: { adults: num(r.pax_adults, 1), children: num(r.pax_children, 0) },
  phone: r.phone ?? '',
  language: r.language ?? 'English',
  meetingPoint: r.meeting_point ?? '',
  amount: num(r.amount),
  currency: r.currency ?? 'EUR',
  status: r.status,
  paymentStatus: r.payment_status,
  assignedGuide: r.assigned_guide ?? '',
  assignedDriver: r.assigned_driver ?? 'None',
  okStatus: !!r.ok_status,
  checkedInGuests: Array.isArray(r.checked_in_guests) ? r.checked_in_guests : [],
  serviceLineItems: r.service_line_items ?? undefined,
  notes: r.notes ?? undefined,
  namesLocked: !!r.names_locked,
  namesComplete: !!r.names_complete,
  tourGradeCode: r.tour_grade_code ?? '',
  tourGradeTitle: r.tour_grade_title ?? '',
  source: r.source ?? 'manual',
  workflow: normalizeWorkflow(r.workflow),
});

export const bookingToRow = (b: Booking): any => ({
  booking_ref: b.bookingRef,
  tour_name: b.tourName ?? '',
  product_code: b.productCode ?? '',
  travel_date: b.travelDate || null,
  tour_time: b.tourTime ?? '',
  lead_traveler: b.leadTraveler ?? '',
  travelers: b.travelers ?? [],
  pax_adults: b.paxCount?.adults ?? 1,
  pax_children: b.paxCount?.children ?? 0,
  phone: b.phone ?? '',
  language: b.language ?? 'English',
  meeting_point: b.meetingPoint ?? '',
  amount: b.amount ?? 0,
  currency: b.currency ?? 'EUR',
  status: b.status,
  payment_status: b.paymentStatus ?? 'Unpaid',
  assigned_guide: b.assignedGuide ?? '',
  assigned_driver: b.assignedDriver ?? 'None',
  ok_status: !!b.okStatus,
  checked_in_guests: b.checkedInGuests ?? [],
  service_line_items: b.serviceLineItems ?? null,
  notes: b.notes ?? null,
  names_locked: !!b.namesLocked,
  names_complete: !!b.namesComplete,
  tour_grade_code: b.tourGradeCode ?? '',
  tour_grade_title: b.tourGradeTitle ?? '',
  source: b.source ?? 'manual',
  workflow: normalizeWorkflow(b.workflow),
});

// ---- Guide ----
const guideFromRow = (r: any): GuideProfile => ({
  id: r.id,
  name: r.name,
  role: r.role ?? 'Guide',
  phone: r.phone ?? '',
  languages: Array.isArray(r.languages) ? r.languages : [],
  skills: Array.isArray(r.skills) ? r.skills : [],
  performanceRating: num(r.performance_rating, 5),
  availability: r.availability ?? 'Active',
  image: r.image ?? '',
});
const guideToRow = (g: GuideProfile): any => ({
  id: g.id,
  name: g.name,
  role: g.role ?? 'Guide',
  phone: g.phone ?? '',
  languages: g.languages ?? [],
  skills: g.skills ?? [],
  performance_rating: g.performanceRating ?? 5,
  availability: g.availability ?? 'Active',
  image: g.image ?? '',
});

// ---- Product ----
const productFromRow = (r: any): Product => ({
  code: r.code,
  name: r.name,
  label: r.label,
  defaultCap: num(r.default_cap, 7),
  grades: Array.isArray(r.grades) ? r.grades : [],
  image: r.image ?? '',
});
const productToRow = (p: Product): any => ({
  code: p.code,
  name: p.name,
  label: p.label,
  default_cap: p.defaultCap ?? 7,
  grades: p.grades ?? [],
  image: p.image ?? '',
});

// ---- Import Batch (append-only Viator upload log) ----
const importFromRow = (r: any): ImportBatch => ({
  id: r.id,
  fileName: r.file_name ?? '',
  fileSize: num(r.file_size),
  importedAt: r.imported_at ?? '',
  importedByName: r.imported_by_name ?? '',
  rowsTotal: num(r.rows_total),
  rowsAdded: num(r.rows_added),
  rowsUpdated: num(r.rows_updated),
  rowsUnchanged: num(r.rows_unchanged),
  rowsCancelled: num(r.rows_cancelled),
  rowsInvalid: num(r.rows_invalid),
  source: r.source ?? 'viator',
});
const importToRow = (b: ImportBatch): any => ({
  id: b.id,
  file_name: b.fileName ?? '',
  file_size: b.fileSize ?? 0,
  imported_at: b.importedAt || null,
  imported_by_name: b.importedByName ?? '',
  rows_total: b.rowsTotal ?? 0,
  rows_added: b.rowsAdded ?? 0,
  rows_updated: b.rowsUpdated ?? 0,
  rows_unchanged: b.rowsUnchanged ?? 0,
  rows_cancelled: b.rowsCancelled ?? 0,
  rows_invalid: b.rowsInvalid ?? 0,
  source: b.source ?? 'viator',
});

// ---- Customer ----
const customerFromRow = (r: any): Customer => ({
  id: r.id,
  name: r.name,
  email: r.email ?? '',
  phone: r.phone ?? '',
  country: r.country ?? '',
  travelHistoryCount: num(r.travel_history_count, 0),
  preferences: Array.isArray(r.preferences) ? r.preferences : [],
  documents: Array.isArray(r.documents) ? r.documents : [],
  notes: r.notes ?? '',
  journey: Array.isArray(r.journey) ? r.journey : [],
});
const customerToRow = (c: Customer): any => ({
  id: c.id,
  name: c.name,
  email: c.email ?? '',
  phone: c.phone ?? '',
  country: c.country ?? '',
  travel_history_count: c.travelHistoryCount ?? 0,
  preferences: c.preferences ?? [],
  documents: c.documents ?? [],
  notes: c.notes ?? '',
  journey: c.journey ?? [],
});

// ---- Expense ----
const expenseFromRow = (r: any): Expense => ({
  id: r.id,
  category: r.category,
  customCategory: r.custom_category ?? undefined,
  amount: num(r.amount),
  date: r.date ?? '',
  description: r.description ?? '',
  status: r.status ?? 'Approved',
  receiptUrl: r.receipt_url ?? undefined,
});
const expenseToRow = (e: Expense): any => ({
  id: e.id,
  category: e.category,
  custom_category: e.customCategory ?? null,
  amount: e.amount ?? 0,
  date: e.date || null,
  description: e.description ?? '',
  status: e.status ?? 'Approved',
  receipt_url: e.receiptUrl ?? null,
});

// ---- Schedule Group (TourGroup shape lives in ScheduleView) ----
const groupFromRow = (r: any): any => ({
  id: r.id,
  serviceDate: r.service_date ?? '',
  tourName: r.tour_name ?? '',
  productCode: r.product_code ?? '',
  productOptionCode: r.product_option_code ?? 'TG1',
  departureTime: r.departure_time ?? '09:00',
  ticketTime: r.ticket_time ?? '09:30',
  ticketStatus: r.ticket_status ?? 'Pending',
  guideName: r.guide_name ?? null,
  capacity: num(r.capacity, 7),
  notes: r.notes ?? '',
  travelerIds: Array.isArray(r.traveler_ids) ? r.traveler_ids : [],
});
const groupToRow = (g: any): any => ({
  id: g.id,
  service_date: g.serviceDate || null,
  tour_name: g.tourName ?? '',
  product_code: g.productCode ?? '',
  product_option_code: g.productOptionCode ?? 'TG1',
  departure_time: g.departureTime ?? '09:00',
  ticket_time: g.ticketTime ?? '09:30',
  ticket_status: g.ticketStatus ?? 'Pending',
  guide_name: g.guideName ?? null,
  capacity: g.capacity ?? 7,
  notes: g.notes ?? '',
  traveler_ids: g.travelerIds ?? [],
});

// ---- WhatsApp Template ----
const templateFromRow = (r: any): WhatsappTemplate => ({
  id: r.id,
  title: r.title ?? '',
  en: r.en ?? '',
  es: r.es ?? '',
  it: r.it ?? '',
});
const templateToRow = (t: WhatsappTemplate, i = 0): any => ({
  id: t.id,
  title: t.title ?? '',
  en: t.en ?? '',
  es: t.es ?? '',
  it: t.it ?? '',
  sort: i,
});

export const ENTITIES: Record<string, EntityConfig> = {
  sole_reservations: {
    table: 'bookings', pk: 'booking_ref', pkOf: (b: Booking) => b.bookingRef,
    fromRow: bookingFromRow, toRow: bookingToRow, orderBy: 'travel_date',
  },
  sole_guides: {
    table: 'guides', pk: 'id', pkOf: (g: GuideProfile) => g.id,
    fromRow: guideFromRow, toRow: guideToRow, orderBy: 'created_at',
  },
  sole_custom_products: {
    table: 'products', pk: 'code', pkOf: (p: Product) => p.code,
    fromRow: productFromRow, toRow: productToRow, orderBy: 'created_at',
  },
  sole_customers: {
    table: 'customers', pk: 'id', pkOf: (c: Customer) => c.id,
    fromRow: customerFromRow, toRow: customerToRow, orderBy: 'created_at',
  },
  sole_expenses: {
    table: 'expenses', pk: 'id', pkOf: (e: Expense) => e.id,
    fromRow: expenseFromRow, toRow: expenseToRow, orderBy: 'date',
  },
  sole_schedule_groups: {
    table: 'schedule_groups', pk: 'id', pkOf: (g: any) => g.id,
    fromRow: groupFromRow, toRow: groupToRow, orderBy: 'created_at',
  },
  sole_whatsapp_templates: {
    table: 'whatsapp_templates', pk: 'id', pkOf: (t: WhatsappTemplate) => t.id,
    fromRow: templateFromRow, toRow: templateToRow, orderBy: 'sort',
  },
  sole_imports: {
    table: 'import_batches', pk: 'id', pkOf: (b: ImportBatch) => b.id,
    fromRow: importFromRow, toRow: importToRow, orderBy: 'imported_at',
  },
};

export const TABLE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITIES).map(([key, cfg]) => [cfg.table, key])
);
