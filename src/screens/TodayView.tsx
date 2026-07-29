import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Icon } from '../ui/Icon';
import {
  Btn, C, Card, Empty, Hov, Label, MONO, Section, SectionHead, useToast,
} from '../ui/kit';
import { commit } from '../lib/store';
import {
  delayOf, minutesOf, rangeLabelFor, rel, short, sundayWeek, today, uid,
} from '../utils/dates';
import { guidePhone, paxOf, productName } from '../utils/selectors';
import { canSeeMoney } from '../utils/access';
import { RollingNumber } from '../ui/RollingNumber';
import { mergeForImport, readViatorFile } from '../utils/viator';
import type { Booking, ImportBatch } from '../types';
import type { ViewProps } from './types';

const WF_LABELS = ['Name collected', 'Confirmed', 'Time sent', 'Review asked'];
const WF_COLORS = ['#0b1220', '#1f4e8c', '#fd9707', '#0f6b48'];

interface Props extends ViewProps {
  onOpenBooking: (ref: string) => void;
}

/** A distinct departure = one date + time + product + option. */
function tourCount(list: Booking[]): number {
  const keys = new Set(list.map(x => `${x.date}|${x.tourTime || x.resTime}|${x.code}|${x.tg}`));
  return keys.size;
}
const paxSum = (list: Booking[]): number => list.reduce((n, x) => n + paxOf(x), 0);

export function TodayView({
  store, user, range, rangeValue, onGo, onOpenBooking,
}: Props) {
  // Money is a role question now, not a PIN question. Operations and guides
  // never see revenue, so the cards are absent rather than masked — a blurred
  // figure with no way to reveal it is just clutter.
  const showMoney = canSeeMoney(user.role);
  const toast = useToast();
  const t = today();

  const [busy, setBusy] = useState(false);
  const [hot, setHot] = useState(false);
  const [error, setError] = useState('');
  const [showAllImports, setShowAllImports] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /* Newest upload first. The log is shared, so this is every operator's
     imports, not just this browser's. */
  const imports = useMemo(
    () => [...store.imports].sort((a, b) => b.importedAt.localeCompare(a.importedAt)),
    [store.imports],
  );
  const shownImports = showAllImports ? imports : imports.slice(0, 5);

  const live = useMemo(
    () => store.bookings.filter(b => b.status !== 'Cancelled'),
    [store.bookings],
  );

  const inRange = useMemo(
    () => live.filter(x => x.date >= rangeValue[0] && x.date <= rangeValue[1]),
    [live, rangeValue],
  );

  const wk = sundayWeek(t);
  const inWeek = useMemo(() => live.filter(x => x.date >= wk[0] && x.date <= wk[1]), [live, wk]);
  const inMonth = useMemo(
    () => live.filter(x => x.date.slice(0, 7) === t.slice(0, 7)),
    [live, t],
  );

  const runsheet = useMemo(() => {
    const src = range.mode === 'today' ? live.filter(x => x.date === t) : inRange;
    return [...src].sort((a, b) =>
      (a.date + (a.tourTime || a.resTime)).localeCompare(b.date + (b.tourTime || b.resTime)));
  }, [live, inRange, range.mode, t]);

  const unassigned14 = useMemo(
    () => live
      .filter(x => x.date >= t && x.date <= rel(14) && (!x.guide || !x.tourTime))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [live, t],
  );

  const wfBars = useMemo(() => {
    const src = inRange;
    return WF_LABELS.map((label, i) => {
      const done = src.filter(x => x.wf[i]).length;
      const pct = src.length ? Math.round((done / src.length) * 100) : 0;
      return { label, color: WF_COLORS[i], pct: `${pct}%`, count: `${done}/${src.length}` };
    });
  }, [inRange]);

  const now = new Date();
  const nowHM = now.getHours() * 60 + now.getMinutes();

  /* ── Viator import ── */
  const runImport = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setHot(false);
    try {
      const { incoming, cancelled, invalid, total } = await readViatorFile(file);

      const byRef = new Map(store.bookings.map(b => [b.ref, b]));
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      const merged = [...store.bookings];

      for (const inc of incoming) {
        const prev = byRef.get(inc.ref);
        const next = mergeForImport(inc, prev);
        if (!prev) { merged.push(next); added++; continue; }
        if (JSON.stringify(prev) === JSON.stringify(next)) { unchanged++; continue; }
        merged[merged.indexOf(prev)] = next;
        updated++;
      }

      // Stock any product code the export mentions that the catalogue lacks.
      const known = new Set(store.products.map(p => p.code));
      const products = [...store.products];
      for (const inc of incoming) {
        if (inc.code && !known.has(inc.code)) {
          known.add(inc.code);
          products.push({
            code: inc.code,
            name: inc.tourName || inc.code,
            label: inc.tourName || inc.code,
            defaultCap: 7,
            options: [{ tg: inc.tg, title: inc.tgTitle || inc.tg, cap: 7 }],
          });
        }
      }

      // The log entry rides along in the same commit as the bookings it
      // produced, so the history can never claim an import the data does not
      // reflect.
      const batch: ImportBatch = {
        id: uid('imp'),
        fileName: file.name,
        fileSize: file.size,
        importedAt: new Date().toISOString(),
        importedBy: user.id,
        importedByName: user.name,
        rowsTotal: total,
        rowsAdded: added,
        rowsUpdated: updated,
        rowsUnchanged: unchanged,
        rowsCancelled: cancelled,
        rowsInvalid: invalid,
        source: 'viator',
      };

      commit({ bookings: merged, products, imports: [...store.imports, batch] });
      toast(`${added} new · ${updated} updated · ${cancelled} cancelled rows skipped`);
    } catch (e) {
      setError((e as Error)?.message || 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setHot(false);
    void runImport(e.dataTransfer?.files?.[0]);
  };

  const activity = [
    {
      label: 'Selected range',
      note: rangeLabelFor(range.mode, range.anchor, range.end),
      tours: tourCount(inRange), pax: paxSum(inRange),
    },
    {
      label: 'This week',
      note: `${short(wk[0])} — ${short(wk[1])}`,
      tours: tourCount(inWeek), pax: paxSum(inWeek),
    },
    {
      label: 'This month',
      note: now.toLocaleDateString('en-GB', { month: 'long' }),
      tours: tourCount(inMonth), pax: paxSum(inMonth),
    },
  ];

  const revenue = [
    {
      label: 'Incoming revenue', note: 'selected range',
      total: inRange.reduce((n, x) => n + x.gross, 0), count: inRange.length,
    },
    {
      label: 'Incoming revenue', note: 'this month',
      total: inMonth.reduce((n, x) => n + x.gross, 0), count: inMonth.length,
    },
  ];

  return (
    <>
      {/* ── activity ── */}
      <div data-r="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {activity.map((c, i) => (
          <Card key={c.label} style={{ padding: '13px 15px', animationDelay: delayOf(i * 2) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Label>{c.label}</Label>
              <span style={{ fontSize: 10, color: '#a9b0ba' }}>{c.note}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <Stat value={c.tours} unit="tours" />
              <div style={{ width: 1, height: 26, background: C.lineSoft }} />
              <Stat value={c.pax} unit="passengers" />
            </div>
          </Card>
        ))}
      </div>

      {/* ── revenue · managers only ── */}
      {showMoney && (
        <div data-r="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {revenue.map((c, i) => (
            <Card
              key={c.note}
              style={{
                padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 14,
                animationDelay: delayOf(i * 2 + 6),
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <Label>{c.label}</Label>
                  <span style={{ fontSize: 10, color: '#a9b0ba' }}>{c.note}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <RollingNumber
                    value={c.total}
                    prefix="€"
                    decimals={2}
                    style={{
                      fontSize: 25, fontWeight: 600, letterSpacing: '-.02em',
                      lineHeight: 1, color: C.ink,
                    }}
                  />
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {c.count} bookings
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div
        data-r="split"
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,1.62fr) minmax(0,1fr)',
          gap: 14, alignItems: 'start',
        }}
      >
        {/* ── runsheet ── */}
        <Section style={{ animationDelay: '.1s' }}>
          <SectionHead title={range.mode === 'today' ? "Today's departures" : 'Departures in range'}>
            <Btn small onClick={() => onGo('groups')}>Open grouping</Btn>
          </SectionHead>

          {!runsheet.length && <Empty>No departures in this range.</Empty>}

          {runsheet.map((x, i) => {
            const tm = x.tourTime || x.resTime;
            const mins = minutesOf(tm);
            const sameDay = x.date === t;
            const done = sameDay && mins + 150 < nowHM;
            const isLive = sameDay && !done && mins <= nowHM;
            const lead = x.travelers[0]?.[0] || '';
            return (
              <Hov
                key={x.ref}
                as="div"
                className="row up-sm"
                role="button"
                tabIndex={0}
                onClick={() => onOpenBooking(x.ref)}
                onKeyDown={(e: any) => { if (e.key === 'Enter') onOpenBooking(x.ref); }}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  borderBottom: `1px solid ${C.lineFaint}`, cursor: 'pointer',
                  animationDelay: delayOf(i),
                }}
                hover={{ background: C.wash }}
              >
                <div style={{
                  width: 56, flexShrink: 0, padding: '11px 0 11px 15px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 12.5, fontWeight: 600, letterSpacing: '-.03em',
                  }}>
                    {tm || '—'}
                  </span>
                  <span style={{
                    fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase',
                    fontWeight: 600,
                    color: done ? '#a9b0ba' : isLive ? C.accentInk : C.muted,
                  }}>
                    {done ? 'Done' : isLive ? 'Now' : sameDay ? 'Later' : short(x.date)}
                  </span>
                </div>

                <div style={{
                  width: 2, flexShrink: 0, margin: '11px 11px 11px 0', borderRadius: 2,
                  background: !x.guide ? '#be3455' : isLive ? C.accent : done ? '#d3d7de' : C.ink,
                }} />

                <div style={{
                  flex: 1, minWidth: 130, padding: '11px 12px 11px 0',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
                    <span style={{
                      fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {productName(store.products, x)}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#a9b0ba', flexShrink: 0 }}>
                      {x.tg}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11.5, color: '#6b737f', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {paxOf(x)} pax · {lead} · {x.ref}
                  </span>
                </div>

                <div style={{
                  width: 150, flexShrink: 0, padding: '11px 15px 11px 0',
                  display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end',
                }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                    background: x.guide ? '#f0f2f5' : C.badBg,
                    color: x.guide ? '#3f4756' : C.bad,
                  }}>
                    {x.guide || 'No guide'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
                    {x.guide ? guidePhone(store.guides, store.staff, x.guide) : 'assign a guide'}
                  </span>
                </div>
              </Hov>
            );
          })}
        </Section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── needs a guide ── */}
          <Section style={{ animationDelay: '.14s' }}>
            <SectionHead title="Needs a guide" note="next 14 days">
              <RollingNumber
                value={unassigned14.length}
                style={{
                  fontSize: 11, fontWeight: 600, color: C.bad, background: C.badBg,
                  borderRadius: 11, padding: '1px 8px',
                }}
              />
            </SectionHead>

            {!unassigned14.length && (
              <Empty pad={22}>Every departure in the next 14 days has a guide.</Empty>
            )}

            {unassigned14.slice(0, 8).map(u => (
              <Hov
                key={u.ref}
                as="div"
                className="row"
                role="button"
                tabIndex={0}
                onClick={() => onOpenBooking(u.ref)}
                onKeyDown={(e: any) => { if (e.key === 'Enter') onOpenBooking(u.ref); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px',
                  borderBottom: `1px solid ${C.lineFaint}`, cursor: 'pointer',
                }}
                hover={{ background: C.wash }}
              >
                <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {short(u.date)}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>
                    {u.tourTime || u.resTime || '—'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {productName(store.products, u)}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.muted }}>
                    {paxOf(u)} pax · {u.travelers[0]?.[0] || ''}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accentInk, flexShrink: 0 }}>
                  Assign
                </span>
              </Hov>
            ))}
          </Section>

          {/* ── message workflow ── */}
          <Section style={{ padding: '14px 15px', animationDelay: '.18s' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 13.5, fontWeight: 600 }}>
              Message workflow · selected range
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {wfBars.map(w => (
                <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 104, flexShrink: 0, fontSize: 11.5, color: C.body }}>
                    {w.label}
                  </span>
                  <div style={{
                    flex: 1, height: 5, borderRadius: 3, background: '#f0f2f5', overflow: 'hidden',
                  }}>
                    <div
                      className="bar"
                      style={{
                        height: '100%', borderRadius: 3, background: w.color, width: w.pct,
                        transition: 'width .5s cubic-bezier(.16,1,.3,1)',
                      }}
                    />
                  </div>
                  <span style={{
                    width: 44, textAlign: 'right', fontSize: 11, color: C.muted2,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {w.count}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Viator import ── */}
          <Section style={{ padding: '14px 15px', animationDelay: '.22s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Import from Viator</h2>
              <span style={{
                fontSize: 10, fontWeight: 600, color: C.good, background: C.goodBg,
                borderRadius: 4, padding: '1px 6px',
              }}>
                XLSX · CSV
              </span>
            </div>
            <p style={{
              margin: '0 0 12px', fontSize: 11.5, color: C.muted2,
              lineHeight: 1.5, textWrap: 'pretty',
            }}>
              Reads the Viator reservations export as-is. Italian fields are translated,
              Cancellata rows are skipped, and existing bookings are matched on reservation
              number and updated — hand-typed passenger names are kept.
            </p>

            <Hov
              as="label"
              onDragOver={(e: DragEvent) => { e.preventDefault(); setHot(true); }}
              onDragLeave={() => setHot(false)}
              onDrop={onDrop}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', border: `1px dashed ${hot ? C.accent : C.border}`,
                background: hot ? C.accentWash : C.wash, borderRadius: 7, padding: 12,
                fontSize: 12, fontWeight: 500, color: C.body, cursor: 'pointer',
              }}
              hover={{ borderColor: C.accent, background: C.accentWash, color: C.ink }}
            >
              <Icon name={busy ? 'spinner' : 'upload'} size={14} className={busy ? 'spin' : undefined} />
              {busy ? 'Reading the export…' : 'Drop the export here, or choose a file'}
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => {
                  void runImport(e.target.files?.[0]);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </Hov>

            {error && (
              <p className="up-sm" style={{
                margin: '9px 0 0', fontSize: 11.5, fontWeight: 500, color: C.bad,
                background: C.badBg, border: '1px solid #f6dbe1', borderRadius: 6,
                padding: '8px 10px', lineHeight: 1.5, textWrap: 'pretty',
              }}>
                {error}
              </p>
            )}

            {/* ── upload history ── */}
            <div style={{
              marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.lineSoft}`,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em',
                  textTransform: 'uppercase', color: C.muted3,
                }}>
                  Upload history
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.faint }}>
                  {imports.length} file{imports.length === 1 ? '' : 's'}
                </span>
                <div style={{ flex: 1 }} />
                {imports.length > 5 && (
                  <Hov
                    as="button"
                    type="button"
                    onClick={() => setShowAllImports(v => !v)}
                    style={{
                      border: 0, background: 'transparent', fontSize: 11, fontWeight: 600,
                      color: C.accentInk, cursor: 'pointer', padding: '2px 4px',
                    }}
                    hover={{ color: C.ink }}
                  >
                    {showAllImports ? 'Show recent' : `Show all ${imports.length}`}
                  </Hov>
                )}
              </div>

              {!imports.length && (
                <p style={{
                  margin: 0, fontSize: 11.5, color: C.muted, lineHeight: 1.5,
                  textWrap: 'pretty',
                }}>
                  No export has been uploaded yet. Every upload is logged here for the whole
                  team — file name, who uploaded it, and what it changed.
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shownImports.map((b, i) => (
                  <div
                    key={b.id}
                    className="up-sm"
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 5,
                      border: `1px solid ${C.lineSoft}`, borderRadius: 7,
                      padding: '8px 10px', background: i === 0 ? C.accentWash : C.panel,
                      animationDelay: delayOf(i),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
                      <Icon name="fileText" size={12} color={C.muted} />
                      <span
                        title={b.fileName}
                        style={{
                          flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {b.fileName || 'unnamed file'}
                      </span>
                      {i === 0 && (
                        <span style={{
                          flexShrink: 0, fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em',
                          textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3,
                          background: C.ink, color: '#fff',
                        }}>
                          Latest
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      fontFamily: MONO, fontSize: 9.5, color: C.faint,
                    }}>
                      <span>{stampOf(b.importedAt)}</span>
                      <span>·</span>
                      <span>{b.importedByName || 'unknown'}</span>
                      <span>·</span>
                      <span>{bytesOf(b.fileSize)}</span>
                      <span>·</span>
                      <span>{b.rowsTotal} rows</span>
                    </div>

                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <Chip n={b.rowsAdded} label="new" bg={C.goodBg} fg={C.good} />
                      <Chip n={b.rowsUpdated} label="updated" bg={C.infoBg} fg={C.info} />
                      <Chip n={b.rowsUnchanged} label="unchanged" bg={C.paper} fg={C.muted2} />
                      <Chip n={b.rowsCancelled} label="cancelled" bg={C.warnBg} fg={C.warn} />
                      {b.rowsInvalid > 0 && (
                        <Chip n={b.rowsInvalid} label="unreadable" bg={C.badBg} fg={C.bad} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Stat({ value, unit }: { value: number; unit: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <RollingNumber
        value={value}
        style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}
      />
      <span style={{ fontSize: 10.5, color: C.muted }}>{unit}</span>
    </div>
  );
}

/** A single outcome count. Zero is still worth showing — it tells the operator
    the file was read and genuinely contained nothing of that kind. */
function Chip({ n, label, bg, fg }: { n: number; label: string; bg: string; fg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 10,
      fontWeight: 600, padding: '2px 7px', borderRadius: 11, background: bg, color: fg,
    }}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ fontWeight: 500, opacity: 0.85 }}>{label}</span>
    </span>
  );
}

/** "28 Jul, 14:32" — date and time, because two exports a day is normal here. */
function stampOf(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ` +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function bytesOf(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
