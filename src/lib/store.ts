/* ══════════════════════════════════════════════════════════════════════════
   Hybrid store: localStorage is an instant cache, Supabase is the truth.

   - `hydrate()` reads every table once, then opens a realtime channel so an
     edit by a teammate (or the same operator in another tab) lands here.
   - `commit()` updates memory immediately so the UI never waits on the network,
     then pushes only the rows that actually changed, and deletes the ones that
     disappeared.
   - Screens read through `useStore()` and write through `commit()`. Nothing
     below this file knows Supabase exists.
   ══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from 'react';
import { supabase } from './supabaseClient';
import { ENTITIES, STORE_KEYS, KEYS_FOR_TABLE, type EntityConfig } from './entities';
import type { StoreData, StoreKey } from '../types';

const CACHE_KEY = 'sole_store_cache_v2';

const EMPTY: StoreData = {
  bookings: [], products: [], guides: [], staff: [],
  groups: [], expenses: [], templates: [], customers: [], imports: [],
};

let data: StoreData = { ...EMPTY };
let syncEnabled = false;
let channel: ReturnType<typeof supabase.channel> | null = null;

const listeners = new Set<() => void>();
type ErrorHandler = (message: string) => void;
let errorHandler: ErrorHandler = msg => console.error('[sole-store]', msg);

/** Route write failures to a toast instead of the console. */
export function onStoreError(fn: ErrorHandler): void {
  errorHandler = fn;
}

function emit(): void {
  for (const fn of listeners) fn();
}

/* ── cache ──────────────────────────────────────────────────────────────── */
function readCache(): Partial<StoreData> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoreData>) : null;
  } catch {
    return null;
  }
}

function writeCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* private mode or quota — the cache is an optimisation, not a requirement */
  }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Paint from the last session's data while the network round-trip is in flight. */
export function primeFromCache(): void {
  const cached = readCache();
  if (!cached) return;
  const next = { ...EMPTY };
  for (const key of STORE_KEYS) {
    const list = cached[key];
    if (Array.isArray(list)) (next as any)[key] = list;
  }
  data = next;
  emit();
}

/* ── read ───────────────────────────────────────────────────────────────── */
async function fetchTable(table: string): Promise<void> {
  const keys = KEYS_FOR_TABLE(table);
  if (!keys.length) return;

  const orderBy = ENTITIES[keys[0]].orderBy;
  let query = supabase.from(table).select('*');
  if (orderBy) query = query.order(orderBy, { ascending: true });

  const { data: rows, error } = await query;
  if (error) {
    // A table the signed-in role cannot reach usually comes back as an empty
    // set rather than an error (that is how `expenses` behaves for operations),
    // so an error here is a genuine problem. Keep the cached copy either way.
    console.warn(`[sole-store] read ${table}: ${error.message}`);
    return;
  }

  const next = { ...data };
  for (const key of keys) {
    const cfg = ENTITIES[key];
    const kept = cfg.rowFilter ? (rows ?? []).filter(cfg.rowFilter) : (rows ?? []);
    (next as any)[key] = kept.map(cfg.fromRow);
  }
  data = next;
  writeCache();
  emit();
}

const uniqueTables = (): string[] =>
  Array.from(new Set(STORE_KEYS.map(k => ENTITIES[k].table)));

/* ── write ──────────────────────────────────────────────────────────────── */
async function push(cfg: EntityConfig, prev: any[], next: any[]): Promise<void> {
  // Compare the *rows* rather than the objects: toRow folds in the array index
  // (templates persist their order as `sort`), so a pure reorder counts as a
  // change while an untouched row does not.
  const prevRows = new Map(prev.map((o, i) => [cfg.pkOf(o), JSON.stringify(cfg.toRow(o, i))]));
  const changed = next
    .map((o, idx) => ({ pk: cfg.pkOf(o), row: cfg.toRow(o, idx) }))
    .filter(({ pk, row }) => prevRows.get(pk) !== JSON.stringify(row))
    .map(c => c.row);

  if (changed.length) {
    const { error } = await supabase.from(cfg.table).upsert(changed, { onConflict: cfg.pk });
    if (error) throw new Error(`${cfg.table}: ${error.message}`);
  }

  const nextPks = new Set(next.map(o => cfg.pkOf(o)));
  const removed = prev.map(o => cfg.pkOf(o)).filter(pk => pk && !nextPks.has(pk));
  if (removed.length) {
    const { error } = await supabase.from(cfg.table).delete().in(cfg.pk, removed);
    if (error) throw new Error(`${cfg.table}: ${error.message}`);
  }
}

/**
 * Apply a patch locally, then persist it. The UI updates on the same tick;
 * the network catches up. A failed push surfaces as a toast and the next
 * realtime tick or reload restores the server's version.
 */
export function commit(patch: Partial<StoreData>): void {
  const prev = data;
  data = { ...data, ...patch };
  writeCache();
  emit();

  if (!syncEnabled) return;

  for (const key of Object.keys(patch) as StoreKey[]) {
    const next = patch[key];
    if (!Array.isArray(next)) continue;
    void push(ENTITIES[key], prev[key] as any[], next as any[]).catch((e: Error) =>
      errorHandler(e.message || `Could not save ${key}`),
    );
  }
}

/* ── lifecycle ──────────────────────────────────────────────────────────── */
let refetchTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// StrictMode mounts effects twice in development, and a signed-in reload can
// race a manual refresh. Share one in-flight hydrate rather than opening two
// realtime channels.
let hydrating: Promise<void> | null = null;

export function hydrate(): Promise<void> {
  if (!hydrating) {
    hydrating = doHydrate().finally(() => { hydrating = null; });
  }
  return hydrating;
}

async function doHydrate(): Promise<void> {
  await Promise.all(uniqueTables().map(fetchTable));
  syncEnabled = true;

  if (channel) return;
  const ch = supabase.channel('sole-store');
  for (const table of uniqueTables()) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      // Coalesce bursts (a bulk import fires one event per row).
      clearTimeout(refetchTimers[table]);
      refetchTimers[table] = setTimeout(() => void fetchTable(table), 180);
    });
  }
  ch.subscribe();
  channel = ch;
}

export function teardown(): void {
  syncEnabled = false;
  for (const t of Object.values(refetchTimers)) clearTimeout(t);
  refetchTimers = {};
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  data = { ...EMPTY };
  clearCache();
  emit();
}

/** Force a re-read of everything (used by the header's refresh action). */
export async function refresh(): Promise<void> {
  await Promise.all(uniqueTables().map(fetchTable));
}

/* ── React binding ──────────────────────────────────────────────────────── */
function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getSnapshot = (): StoreData => data;

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
