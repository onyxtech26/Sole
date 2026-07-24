import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ENTITIES, TABLE_TO_KEY, EntityConfig } from '../lib/entities';

/**
 * Hybrid reactive store: localStorage acts as an instant in-memory cache while
 * Supabase is the shared source of truth.
 *
 *  - On login we hydrate every mapped table into the cache and open a realtime
 *    channel, so edits from any teammate/tab appear live.
 *  - `writeStore` updates the cache immediately (snappy UI) AND pushes a
 *    diff (upsert changed rows + delete removed rows) to Supabase.
 *  - Views keep using the exact same read/write/subscribe helpers as before —
 *    the Supabase wiring is invisible to them.
 */

const SYNC_EVENT = 'sole-store-sync';

let syncEnabled = false; // becomes true after initSupabaseSync() hydrates

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write to the local cache and notify same-tab listeners (no Supabase push). */
function writeCacheOnly<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
}

/**
 * Push an array write to Supabase: upsert only the rows that actually changed
 * (new or edited) and delete rows that were removed. Diffing against the prior
 * cache avoids rewriting the whole collection on every small edit.
 */
async function pushToSupabase(cfg: EntityConfig, prev: any[] | null, next: any[]): Promise<void> {
  if (!Array.isArray(next)) return;
  try {
    const prevByPk = new Map<string, string>(
      Array.isArray(prev) ? prev.map(o => [cfg.pkOf(o), JSON.stringify(o)]) : []
    );
    // Keep the original index (used as the `sort` value for templates).
    const changed = next
      .map((o, idx) => ({ o, idx }))
      .filter(({ o }) => prevByPk.get(cfg.pkOf(o)) !== JSON.stringify(o));

    if (changed.length > 0) {
      const rows = changed.map(({ o, idx }) => cfg.toRow(o, idx));
      const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: cfg.pk });
      if (error) throw error;
    }

    if (Array.isArray(prev)) {
      const nextPks = new Set(next.map(o => cfg.pkOf(o)));
      const removed = prev.map(o => cfg.pkOf(o)).filter(pk => pk != null && !nextPks.has(pk));
      if (removed.length > 0) {
        const { error } = await supabase.from(cfg.table).delete().in(cfg.pk, removed);
        if (error) throw error;
      }
    }
  } catch (e: any) {
    console.error(`[sole-sync] push ${cfg.table} failed:`, e?.message || e);
  }
}

export function writeStore<T>(key: string, value: T): void {
  const cfg = ENTITIES[key];
  const prev = cfg ? readStore<any[] | null>(key, null) : null;
  writeCacheOnly(key, value);
  if (cfg && syncEnabled) {
    void pushToSupabase(cfg, prev, value as any);
  }
}

/** Subscribe to changes for a key from any view (same tab) or any other tab. */
function subscribe(key: string, onChange: () => void): () => void {
  const handleCustom = (e: Event) => {
    if ((e as CustomEvent).detail?.key === key) onChange();
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === key) onChange();
  };
  window.addEventListener(SYNC_EVENT, handleCustom as EventListener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(SYNC_EVENT, handleCustom as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}

// ─── Supabase hydration + realtime ──────────────────────────────────────────
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const refetchTimers: Record<string, any> = {};

async function fetchTable(key: string, cfg: EntityConfig): Promise<void> {
  const q = supabase.from(cfg.table).select('*');
  const { data, error } = cfg.orderBy ? await q.order(cfg.orderBy, { ascending: true }) : await q;
  if (error) {
    // e.g. expenses blocked by RLS for non-managers — leave cache untouched.
    console.warn(`[sole-sync] fetch ${cfg.table}: ${error.message}`);
    return;
  }
  const list = (data ?? []).map(cfg.fromRow);
  writeCacheOnly(key, list);
}

function scheduleRefetch(key: string, cfg: EntityConfig) {
  clearTimeout(refetchTimers[key]);
  refetchTimers[key] = setTimeout(() => void fetchTable(key, cfg), 150);
}

/** Hydrate all tables into cache and open the realtime channel. Call after login. */
export async function initSupabaseSync(): Promise<void> {
  // Initial hydrate (parallel) so views mount with real data already cached.
  await Promise.all(Object.entries(ENTITIES).map(([key, cfg]) => fetchTable(key, cfg)));
  syncEnabled = true;

  if (realtimeChannel) return;
  const channel = supabase.channel('sole-store');
  for (const [key, cfg] of Object.entries(ENTITIES)) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: cfg.table },
      () => scheduleRefetch(key, cfg)
    );
  }
  channel.subscribe();
  realtimeChannel = channel;
}

export function teardownSupabaseSync(): void {
  syncEnabled = false;
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

/**
 * Persistent, reactive state owned by a view. Behaves like useState but persists
 * to localStorage + Supabase and stays in sync with edits from other views/tabs.
 * Seeds from `initializer()` only when nothing has been hydrated yet.
 */
export function usePersistentState<T>(
  key: string,
  initializer: () => T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        /* fall through to seed */
      }
    }
    const seed = initializer();
    writeStore(key, seed); // pushes seed to Supabase only if the table is empty-cached
    return seed;
  });

  useEffect(() => {
    return subscribe(key, () => {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        try {
          setState(JSON.parse(raw) as T);
        } catch {
          /* ignore malformed */
        }
      }
    });
  }, [key]);

  const set = useCallback(
    (value: T) => {
      setState(value);
      writeStore(key, value);
    },
    [key]
  );

  return [state, set];
}

/**
 * Read-only reactive view of a store key. Use in consumers (e.g. the booking form
 * reading the live guides/products directory) that don't own the data.
 */
export function usePersistentValue<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));
  useEffect(() => {
    setValue(readStore(key, fallback));
    return subscribe(key, () => setValue(readStore(key, fallback)));
    // fallback is intentionally not a dep; it's a static default per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}
