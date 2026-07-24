/*
 * One-off Supabase seeder (run with tsx). Reads the service key + report path
 * from env vars so no secret is written to disk.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... REPORT_XLSX=... npx tsx scripts/seed.ts
 *
 * It is idempotent: auth users, profiles and all reference rows are upserted.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { SEED_GUIDES, SEED_CUSTOMERS, SEED_EXPENSES } from '../src/utils/seed';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../src/utils/whatsappTemplates';
import { ENTITIES, bookingToRow } from '../src/lib/entities';
import { transformRows, mergeForImport } from '../src/utils/viatorImport';
import type { Booking } from '../src/types';

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_KEY!;
const REPORT = process.env.REPORT_XLSX!;
if (!URL || !SERVICE) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1); }

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

// Product catalog (kept in sync with src/components/ProductsView.tsx DEFAULT_PRODUCTS)
const PRODUCTS = [
  { code: '5524558P4', name: 'Private Colosseo', label: 'Private Colosseum Tour', defaultCap: 7,
    grades: [{ code: 'TG1', name: 'Private Luxury', capacity: 7 }, { code: 'TG2', name: 'Couple Tour', capacity: 2 }] },
  { code: '5524558P1', name: 'Colosseo guide', label: 'Group Colosseum Tour', defaultCap: 24,
    grades: [{ code: 'TG1', name: 'Standard Group', capacity: 24 }, { code: 'TG2', name: 'Semi-Private Group', capacity: 7 }] },
  { code: '5524558P19', name: 'Walking Highlights', label: 'Walking Tour', defaultCap: 7,
    grades: [{ code: 'TG1', name: 'Highlights Walk', capacity: 7 }] },
  { code: '5524558P2', name: 'Golf Cart Rome', label: 'Golf Cart Tour', defaultCap: 7,
    grades: [{ code: 'TG1', name: 'Golf Cart Group', capacity: 7 }] },
  { code: '5524558P10', name: 'Famagusta Tour', label: 'Private Cyprus Tour', defaultCap: 7,
    grades: [{ code: 'TG1', name: 'Private Cyprus Tour', capacity: 7 }] },
  { code: '5524558P18', name: 'Rome Photo Shoot', label: 'Professional Photo Shoot', defaultCap: 5,
    grades: [{ code: 'TG1', name: 'Standard Shoot', capacity: 5 }] },
  { code: '5524558P3', name: 'Vatican Museum', label: 'Vatican Tour', defaultCap: 24,
    grades: [{ code: 'TG1', name: 'Vatican Group', capacity: 24 }, { code: 'TG2', name: 'Vatican Semi-Private', capacity: 7 }] },
];

const USERS = [
  { username: 'sina',   email: 'sina@sole.app',   password: 'Sina@sole2026',   fullName: 'Sina',   role: 'manager' },
  { username: 'masoud', email: 'masoud@sole.app', password: 'Masoud@sole2026', fullName: 'Masoud', role: 'manager' },
  { username: 'tina',   email: 'tina@sole.app',   password: 'Tina@sole2026',   fullName: 'Tina',   role: 'operations' },
];

async function upsert(key: string, rows: any[]) {
  const cfg = ENTITIES[key];
  const mapped = rows.map((r, i) => (cfg.table === 'whatsapp_templates' ? cfg.toRow(r, i) : cfg.toRow(r)));
  const { error } = await admin.from(cfg.table).upsert(mapped, { onConflict: cfg.pk });
  if (error) throw new Error(`upsert ${cfg.table}: ${error.message}`);
  console.log(`  ✓ ${cfg.table}: ${mapped.length} rows`);
}

async function seedAuth() {
  console.log('Auth users + profiles...');
  // Page through existing users once.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byEmail = new Map((list?.users ?? []).map(u => [u.email, u.id]));
  for (const u of USERS) {
    let id = byEmail.get(u.email);
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        user_metadata: { username: u.username, full_name: u.fullName },
      });
      if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
      id = data.user!.id;
      console.log(`  ✓ created ${u.email}`);
    } else {
      // keep password in sync with the documented default
      await admin.auth.admin.updateUserById(id, { password: u.password });
      console.log(`  ✓ exists  ${u.email}`);
    }
    const { error: pErr } = await admin.from('profiles').upsert(
      { id, username: u.username, full_name: u.fullName, role: u.role }, { onConflict: 'id' });
    if (pErr) throw new Error(`profile ${u.username}: ${pErr.message}`);
  }
}

async function seedBookings() {
  if (!REPORT) { console.log('No REPORT_XLSX given — skipping booking import.'); return; }
  console.log(`Importing bookings from ${REPORT} ...`);
  const wb = XLSX.read(fs.readFileSync(REPORT), { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '', raw: true });
  const { bookings, skippedCancelled, skippedInvalid, total } = transformRows(rows);

  // Merge with anything already stored (idempotent daily re-import).
  const { data: existingRows } = await admin.from('bookings').select('*');
  const existing = new Map<string, Booking>();
  for (const r of existingRows ?? []) existing.set(r.booking_ref, ENTITIES.sole_reservations.fromRow(r));

  const merged = bookings.map(b => bookingToRow(mergeForImport(b, existing.get(b.bookingRef))));
  const { error } = await admin.from('bookings').upsert(merged, { onConflict: 'booking_ref' });
  if (error) throw new Error(`upsert bookings: ${error.message}`);
  console.log(`  ✓ report rows: ${total} | imported/updated: ${merged.length} | skipped cancelled: ${skippedCancelled} | skipped invalid: ${skippedInvalid}`);
}

async function main() {
  await seedAuth();
  console.log('Reference data...');
  await upsert('sole_custom_products', PRODUCTS);
  await upsert('sole_guides', SEED_GUIDES);
  await upsert('sole_customers', SEED_CUSTOMERS);
  await upsert('sole_expenses', SEED_EXPENSES);
  await upsert('sole_whatsapp_templates', DEFAULT_WHATSAPP_TEMPLATES);
  await seedBookings();
  console.log('\nDone.');
}
main().catch(e => { console.error('SEED FAILED:', e.message); process.exit(1); });
