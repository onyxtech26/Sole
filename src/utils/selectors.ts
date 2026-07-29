/* Pure derivations shared by the screens. Everything here takes store data as
   arguments and returns new values — no component state, no side effects. */

import type {
  Booking, Guide, Product, StaffMember, StoreData, TourGroup, Traveler,
} from '../types';
import { longDate, shiftTime, uid } from './dates';

/* ── catalogue lookups ──────────────────────────────────────────────────── */

/** A booking may quote a product code the catalogue does not stock yet. */
export function productOf(products: Product[], code: string): Product | null {
  return products.find(p => p.code === code) ?? null;
}

export function productName(products: Product[], b: Pick<Booking, 'code' | 'tourName'>): string {
  const p = productOf(products, b.code);
  if (p) return p.name;
  return b.tourName || b.code || 'Unknown product';
}

export function tgTitleOf(products: Product[], b: Pick<Booking, 'code' | 'tg' | 'tgTitle'>): string {
  const p = productOf(products, b.code);
  const o = p?.options.find(x => x.tg === b.tg);
  return o?.title || b.tgTitle || b.tg;
}

export function capOf(products: Product[], code: string, tg: string): number {
  const p = productOf(products, code);
  const o = p?.options.find(x => x.tg === tg);
  return o?.cap ?? p?.defaultCap ?? 7;
}

export const paxOf = (b: Booking): number => b.travelers.length;

export function guidePhone(guides: Guide[], staff: StaffMember[], name: string): string {
  if (!name) return '';
  return guides.find(g => g.name === name)?.phone
    || staff.find(s => s.name === name)?.phone
    || '';
}

/* ── grouping ───────────────────────────────────────────────────────────── */
export interface TravelerRow {
  id: string;        // "REF#index"
  idx: number;
  name: string;
  age: Traveler[1];
  booking: Booking;
}

export function travelerRows(bookings: Booking[], range: [string, string]): TravelerRow[] {
  const rows: TravelerRow[] = [];
  for (const bk of bookings) {
    if (bk.status === 'Cancelled') continue;
    if (bk.date < range[0] || bk.date > range[1]) continue;
    bk.travelers.forEach((t, i) => {
      rows.push({ id: `${bk.ref}#${i}`, idx: i, name: t[0], age: t[1], booking: bk });
    });
  }
  return rows;
}

/** travellerId -> groupId */
export function assignedIds(groups: TourGroup[]): Record<string, string> {
  const set: Record<string, string> = {};
  for (const g of groups) for (const m of g.members) set[m] = g.id;
  return set;
}

/** bookingRef -> 1-based band number, for the "G3" chips. */
export function groupNumbers(groups: TourGroup[]): Record<string, number> {
  const out: Record<string, number> = {};
  groups.forEach((g, i) => {
    for (const m of g.members) {
      const ref = m.split('#')[0];
      if (!out[ref]) out[ref] = i + 1;
    }
  });
  return out;
}

/**
 * Keep the flat booking fields (guide, tour time) in step with the group each
 * of its passengers sits in — that is what every other screen reads.
 *
 * Only bookings that are in a group, or that have just been pulled out of one,
 * are touched: a guide assigned straight from the Bookings drawer on an
 * ungrouped booking has to survive later group edits.
 */
export function syncBookingsToGroups(
  bookings: Booking[],
  groups: TourGroup[],
  prevGroups: TourGroup[],
): Booking[] {
  const byRef: Record<string, { guide: string; tourTime: string }> = {};
  for (const g of groups) {
    for (const m of g.members) {
      const ref = m.split('#')[0];
      if (!byRef[ref]) byRef[ref] = { guide: g.guide || '', tourTime: g.time || '' };
    }
  }

  const wasGrouped: Record<string, true> = {};
  for (const g of prevGroups) {
    for (const m of g.members) wasGrouped[m.split('#')[0]] = true;
  }

  return bookings.map(bk => {
    const hit = byRef[bk.ref];
    if (hit) {
      if (bk.guide === hit.guide && bk.tourTime === hit.tourTime) return bk;
      return { ...bk, ...hit };
    }
    if (wasGrouped[bk.ref] && (bk.guide || bk.tourTime)) {
      return { ...bk, guide: '', tourTime: '' };
    }
    return bk;
  });
}

export function moveTraveler(
  groups: TourGroup[],
  travelerId: string,
  targetGroupId: string | null,
): TourGroup[] {
  const next = groups.map(g => ({ ...g, members: g.members.filter(m => m !== travelerId) }));
  if (targetGroupId) {
    const g = next.find(x => x.id === targetGroupId);
    if (g) g.members = [...g.members, travelerId];
  }
  return next;
}

export interface AutoGroupResult {
  groups: TourGroup[];
  placed: number;
}

/** First-fit packing, largest party first, never splitting a booking. */
export function autoGroup(
  store: Pick<StoreData, 'bookings' | 'groups' | 'products'>,
  range: [string, string],
): AutoGroupResult {
  const rows = travelerRows(store.bookings, range);
  const assigned = assignedIds(store.groups);
  const free = rows.filter(r => !assigned[r.id]);
  if (!free.length) return { groups: store.groups, placed: 0 };

  const parties = new Map<string, { bk: Booking; ids: string[] }>();
  for (const r of free) {
    const entry = parties.get(r.booking.ref) ?? { bk: r.booking, ids: [] };
    entry.ids.push(r.id);
    parties.set(r.booking.ref, entry);
  }
  const ordered = [...parties.values()].sort((a, b) => b.ids.length - a.ids.length);

  const groups: TourGroup[] = store.groups.map(g => ({ ...g, members: [...g.members] }));

  for (const party of ordered) {
    const bk = party.bk;
    const cap = capOf(store.products, bk.code, bk.tg);
    const wanted = bk.tourTime || bk.resTime;

    // Top up an existing band of the same product / option / time that still
    // has room; otherwise open a new one.
    let target = groups.find(g =>
      g.date === bk.date && g.code === bk.code && g.tg === bk.tg &&
      g.time === wanted && g.members.length + party.ids.length <= g.cap,
    );

    if (!target) {
      target = {
        id: uid('grp'),
        date: bk.date,
        code: bk.code,
        tg: bk.tg,
        time: wanted,
        ticketTime: wanted ? shiftTime(wanted, -30) : '',
        ticketStatus: 'Pending',
        guide: bk.guide || '',
        cap,
        notes: `Auto-grouped · ${bk.lang}`,
        members: [],
        tourName: bk.tourName,
      };
      groups.push(target);
    }
    target.members = [...target.members, ...party.ids];
  }

  return { groups, placed: free.length };
}

/* ── manifests ──────────────────────────────────────────────────────────── */
export interface ManifestRow {
  no: string; ref: string; name: string; age: string;
  role: 'Lead' | 'Guest'; phone: string; lang: string;
}

export interface ManifestBand {
  no: string; tour: string; tg: string; tgTitle: string;
  time: string; guide: string; guidePhone: string;
  fill: string; pax: number; cap: number; rows: ManifestRow[];
}

export function manifestBands(store: StoreData, date: string, guideFilter?: string): ManifestBand[] {
  const day = store.bookings.filter(x =>
    x.date === date && x.guide && x.tourTime && x.status !== 'Cancelled'
    && (!guideFilter || x.guide === guideFilter),
  );

  const keys: string[] = [];
  for (const x of day) {
    const k = [x.tourTime, x.code, x.tg, x.guide].join('|');
    if (!keys.includes(k)) keys.push(k);
  }
  keys.sort();

  return keys.map((k, gi) => {
    const [time, code, tg, guide] = k.split('|');
    const items = day.filter(x =>
      x.tourTime === time && x.code === code && x.tg === tg && x.guide === guide);

    const cap = capOf(store.products, code, tg);
    const pax = items.reduce((n, x) => n + paxOf(x), 0);

    let no = 0;
    const rows: ManifestRow[] = [];
    for (const x of items) {
      x.travelers.forEach((tv, i) => {
        no += 1;
        rows.push({
          no: String(no), ref: x.ref, name: tv[0], age: tv[1],
          role: i === 0 ? 'Lead' : 'Guest', phone: i === 0 ? x.phone : '', lang: x.lang,
        });
      });
    }

    const first = items[0];
    return {
      no: String(gi + 1),
      tour: first ? productName(store.products, first) : code,
      tg,
      tgTitle: first ? tgTitleOf(store.products, first) : tg,
      time,
      guide,
      guidePhone: guidePhone(store.guides, store.staff, guide),
      fill: `${pax}/${cap} pax`,
      pax,
      cap,
      rows,
    };
  });
}

/* ── message templates ──────────────────────────────────────────────────── */
export function templateVars(products: Product[], bk: Booking | null): Record<string, string> {
  if (!bk) {
    return { lead: 'traveller', tour: 'your tour', ref: '', date: '', time: '', guide: '', pax: '' };
  }
  return {
    lead: bk.travelers[0]?.[0] || 'traveller',
    tour: productName(products, bk),
    ref: bk.ref,
    date: longDate(bk.date),
    time: bk.tourTime || bk.resTime,
    guide: bk.guide || 'your guide',
    pax: String(paxOf(bk)),
  };
}

/** Fill both the design's `{lead}` and the older build's `{leadTraveler}`. */
export function fillTemplate(body: string, vars: Record<string, string>): string {
  const alias: Record<string, string> = {
    leadTraveler: vars.lead, tourName: vars.tour, bookingRef: vars.ref,
    travelDate: vars.date, tourTime: vars.time, ...vars,
  };
  return String(body || '').replace(/\{(\w+)\}/g, (m, k: string) =>
    alias[k] !== undefined ? alias[k] : m);
}

/* ── attention feed ─────────────────────────────────────────────────────── */
export interface Note {
  id: string; title: string; body: string; dot: string; screen: string; ref?: string;
}

export function notifications(store: StoreData, today: string): Note[] {
  const out: Note[] = [];
  const upcoming = store.bookings.filter(b => b.date >= today && b.status !== 'Cancelled');

  const noGuide = upcoming.filter(b => !b.guide || !b.tourTime);
  if (noGuide.length) {
    out.push({
      id: 'n-guide',
      title: `${noGuide.length} booking${noGuide.length === 1 ? '' : 's'} without a guide`,
      body: 'These departures still need a tour time and a guide before tickets can be issued.',
      dot: '#fdb44e',
      screen: 'groups',
    });
  }

  const noNames = upcoming.filter(b =>
    b.travelers.some(t => /^(Guest|Child|Traveller|Traveler)\s+\d+$/i.test(t[0])));
  if (noNames.length) {
    out.push({
      id: 'n-names',
      title: `${noNames.length} booking${noNames.length === 1 ? '' : 's'} missing passport names`,
      body: 'Tickets are issued in the passengers’ names, so placeholders have to be replaced first.',
      dot: '#ff9a9a',
      screen: 'bookings',
    });
  }

  const unmessaged = upcoming.filter(b => b.wf.slice(0, 3).includes(0));
  if (unmessaged.length) {
    out.push({
      id: 'n-msg',
      title: `${unmessaged.length} traveller${unmessaged.length === 1 ? '' : 's'} awaiting a message`,
      body: 'Greeting, name collection or confirmation has not been sent yet.',
      dot: '#5ad1a0',
      screen: 'messages',
    });
  }

  const pendingExpenses = store.expenses.filter(e => e.status === 'Pending');
  if (pendingExpenses.length) {
    out.push({
      id: 'n-exp',
      title: `${pendingExpenses.length} expense${pendingExpenses.length === 1 ? '' : 's'} pending approval`,
      body: 'Costs stay out of the balance until an owner approves them.',
      dot: '#fdb44e',
      screen: 'finance',
    });
  }

  return out;
}

/* ── command palette ────────────────────────────────────────────────────── */
export interface CmdResult {
  id: string; title: string; sub: string;
  tag: string; tagBg: string; tagFg: string;
  screen: string; ref?: string;
}

export function commandSearch(store: StoreData, query: string, limit = 8): CmdResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: CmdResult[] = [];

  for (const b of store.bookings) {
    if (out.length >= limit) break;
    const lead = b.travelers[0]?.[0] || '';
    const hit =
      b.ref.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      lead.toLowerCase().includes(q) ||
      b.travelers.some(t => t[0].toLowerCase().includes(q));
    if (!hit) continue;
    out.push({
      id: `b-${b.ref}`,
      title: `${lead || 'Booking'} · ${b.ref}`,
      sub: `${productName(store.products, b)} · ${b.date}${b.tourTime ? ` · ${b.tourTime}` : ''}`,
      tag: 'Booking', tagBg: '#eaf1fb', tagFg: '#1f4e8c',
      screen: 'bookings', ref: b.ref,
    });
  }

  for (const g of store.guides) {
    if (out.length >= limit) break;
    if (!g.name.toLowerCase().includes(q) && !g.phone.toLowerCase().includes(q)) continue;
    out.push({
      id: `g-${g.id}`, title: g.name, sub: `${g.langs} · ${g.skills}`,
      tag: 'Guide', tagBg: '#e8f5ef', tagFg: '#0f6b48', screen: 'team',
    });
  }

  for (const c of store.customers) {
    if (out.length >= limit) break;
    if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) continue;
    out.push({
      id: `c-${c.id}`, title: c.name, sub: `${c.country} · ${c.email}`,
      tag: 'Customer', tagBg: '#fdf3e3', tagFg: '#8a5106', screen: 'crm',
    });
  }

  for (const p of store.products) {
    if (out.length >= limit) break;
    if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) continue;
    out.push({
      id: `p-${p.code}`, title: p.name, sub: `${p.code} · ${p.label}`,
      tag: 'Tour', tagBg: '#f6f7f9', tagFg: '#5b6472', screen: 'tours',
    });
  }

  return out.slice(0, limit);
}
