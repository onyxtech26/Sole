// Shared date range filtering utilities used across Dashboard, Finance & Schedule.

export type FilterMode = 'today' | 'week' | 'month' | 'year';

export interface DateRange {
  mode: FilterMode;
  start: Date; // inclusive, local midnight
  end: Date;   // inclusive, local end-of-day
  label: string;
}

// Parse a 'YYYY-MM-DD' string into a LOCAL Date (avoids UTC shift bugs).
export function parseLocalDate(str: string): Date {
  if (!str) return new Date(NaN);
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

// Format a Date into 'YYYY-MM-DD' (local).
export function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Start of the week containing `d`, Sunday as first day.
export function startOfWeekSunday(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay()); // getDay() 0 = Sunday
  return s;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Build an inclusive date range for a given mode anchored on `anchor`.
export function makeRange(mode: FilterMode, anchor: Date): DateRange {
  const a = new Date(anchor);
  if (mode === 'today') {
    return {
      mode,
      start: startOfDay(a),
      end: endOfDay(a),
      label: a.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    };
  }
  if (mode === 'week') {
    const start = startOfWeekSunday(a);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      mode,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
    };
  }
  if (mode === 'month') {
    const start = new Date(a.getFullYear(), a.getMonth(), 1);
    const end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return {
      mode,
      start: startOfDay(start),
      end: endOfDay(end),
      label: `${MONTH_NAMES[a.getMonth()]} ${a.getFullYear()}`
    };
  }
  // year
  const start = new Date(a.getFullYear(), 0, 1);
  const end = new Date(a.getFullYear(), 11, 31);
  return {
    mode,
    start: startOfDay(start),
    end: endOfDay(end),
    label: `${a.getFullYear()}`
  };
}

// Does a 'YYYY-MM-DD' booking date fall within the range?
export function inRange(dateStr: string, range: DateRange): boolean {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
}

// Step the anchor forward/backward by one unit of the mode.
export function stepAnchor(mode: FilterMode, anchor: Date, dir: 1 | -1): Date {
  const a = new Date(anchor);
  if (mode === 'today') a.setDate(a.getDate() + dir);
  else if (mode === 'week') a.setDate(a.getDate() + 7 * dir);
  else if (mode === 'month') a.setMonth(a.getMonth() + dir);
  else a.setFullYear(a.getFullYear() + dir);
  return a;
}
