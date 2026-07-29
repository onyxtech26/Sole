import { useMemo, useState } from 'react';
import { C, Btn, Empty, Hov, Input, MONO, useToast } from '../ui/kit';
import { addDays, longDate, today } from '../utils/dates';
import { manifestBands } from '../utils/selectors';
import { download, manifestCsv, manifestPdf, manifestText, copyText } from '../utils/exports';
import { RollingNumber } from '../ui/RollingNumber';
import type { ViewProps } from './types';

export function ManifestsView({ store, user }: ViewProps) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);

  // A guide only ever sees their own runsheet.
  const guideFilter = user.role === 'guide' ? user.name : undefined;

  const bands = useMemo(
    () => manifestBands(store, date, guideFilter),
    [store, date, guideFilter],
  );

  const dayBookings = store.bookings.filter(b => b.date === date && b.status !== 'Cancelled');
  const totalPax = bands.reduce((n, g) => n + g.pax, 0);

  const savePdf = async () => {
    setBusy(true);
    try {
      const blob = await manifestPdf(bands, date);
      download(`sole-manifest-${date}.pdf`, blob, 'application/pdf');
      toast('Manifest PDF saved');
    } catch (e) {
      toast((e as Error).message || 'Could not build the PDF', 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div data-print="hide" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Btn icon="chevronLeft" onClick={() => setDate(d => addDays(d, -1))} style={{ padding: '5px 9px' }}>
          Previous
        </Btn>
        <Input
          type="date"
          value={date}
          onChange={(e: any) => setDate(e.target.value)}
          style={{ width: 150, background: C.panel }}
        />
        <Btn onClick={() => setDate(d => addDays(d, 1))} style={{ padding: '5px 9px' }}>
          Next<span style={{ marginLeft: 2 }}>›</span>
        </Btn>
        <Btn onClick={() => setDate(today())}>Today</Btn>

        <span style={{ fontSize: 12, color: C.body, fontWeight: 500, marginLeft: 4 }}>
          <RollingNumber value={bands.length} /> group{bands.length === 1 ? '' : 's'} ·{' '}
          <RollingNumber value={totalPax} /> passenger{totalPax === 1 ? '' : 's'}
          {dayBookings.length > 0 && (
            <>
              {' · '}
              <RollingNumber value={dayBookings.length} /> booking
              {dayBookings.length === 1 ? '' : 's'} that day
            </>
          )}
        </span>

        <div style={{ flex: 1 }} />

        <Btn
          icon="copy"
          onClick={() => {
            void copyText(manifestText(bands, date)).then(ok =>
              toast(ok ? 'Manifest copied as text' : 'Copy was blocked by the browser', ok ? 'ok' : 'bad'));
          }}
        >
          Copy text
        </Btn>
        <Btn
          icon="download"
          onClick={() => {
            download(`sole-manifest-${date}.csv`, manifestCsv(bands));
            toast('CSV saved');
          }}
        >
          CSV
        </Btn>
        <Btn icon={busy ? 'spinner' : 'fileText'} onClick={savePdf} disabled={busy}>
          {busy ? 'Building…' : 'PDF'}
        </Btn>
        <Btn variant="primary" icon="printer" style={{ padding: '6px 11px', fontSize: 12 }} onClick={() => window.print()}>
          Print
        </Btn>
      </div>

      <section data-r="doc" style={{
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 12,
          borderBottom: `2px solid ${C.ink}`, paddingBottom: 12, marginBottom: 18,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo-mark.png" alt="" style={{ height: 18, width: 'auto' }} />
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.16em' }}>SOLE</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>
              Sun Tours Travels · daily manifest
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{longDate(date)}</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: C.muted }}>
              {bands.length} groups · {totalPax} passengers
            </p>
          </div>
        </div>

        {!bands.length && (
          <Empty pad={40}>
            {guideFilter
              ? 'You have no grouped departures on this day.'
              : 'No grouped departures on this day. A band needs both a tour time and a guide before it appears on the manifest.'}
          </Empty>
        )}

        {bands.map(g => (
          <div key={`${g.no}-${g.time}-${g.guide}`} className="up" style={{ marginBottom: 22 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
              background: C.paper, borderRadius: 6, padding: '8px 11px', marginBottom: 8,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, background: C.ink, color: '#fff',
                borderRadius: 4, padding: '2px 7px',
              }}>
                GRP {g.no}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{g.tour}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                {g.tg} · {g.tgTitle}
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{g.time}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{g.guide}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{g.guidePhone}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, borderRadius: 11, padding: '1px 8px',
                background: g.pax >= g.cap ? C.badBg : C.goodBg,
                color: g.pax >= g.cap ? C.bad : C.good,
              }}>
                {g.fill}
              </span>
            </div>

            <div data-r="scroll" style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 560,
              }}>
                <thead>
                  <tr style={{ background: C.wash }}>
                    {['#', 'Name', 'Age', 'Role', 'Reference', 'Phone', 'Lang'].map(h => (
                      <th key={h} style={{
                        textAlign: h === '#' ? 'center' : 'left', padding: '6px 9px',
                        borderBottom: `1px solid ${C.line}`, fontSize: 9.5, fontWeight: 600,
                        letterSpacing: '.07em', textTransform: 'uppercase', color: C.muted2,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <Hov
                      as="tr"
                      key={`${r.ref}-${r.no}`}
                      style={{ borderBottom: `1px solid ${C.lineFaint}` }}
                      hover={{ background: C.wash }}
                    >
                      <td style={{ ...cell, textAlign: 'center', fontFamily: MONO, color: C.faint }}>{r.no}</td>
                      <td style={{ ...cell, fontWeight: 500 }}>{r.name}</td>
                      <td style={cell}>{r.age}</td>
                      <td style={cell}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 6px',
                          background: r.role === 'Lead' ? C.infoBg : C.paper,
                          color: r.role === 'Lead' ? C.info : C.muted2,
                        }}>
                          {r.role}
                        </span>
                      </td>
                      <td style={{ ...cell, fontFamily: MONO, fontSize: 10.5, color: C.muted }}>{r.ref}</td>
                      <td style={{ ...cell, fontFamily: MONO, fontSize: 10.5 }}>{r.phone || '—'}</td>
                      <td style={{ ...cell, fontWeight: 600, color: C.muted2 }}>{r.lang}</td>
                    </Hov>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {bands.length > 0 && (
          <p style={{
            margin: '18px 0 0', paddingTop: 12, borderTop: `1px solid ${C.line}`,
            fontSize: 10.5, color: C.muted,
          }}>
            Every passenger must carry a valid ID document. Emergency contact · Masoud +39 351 118 2663.
          </p>
        )}
      </section>
    </>
  );
}

const cell: React.CSSProperties = { padding: '6px 9px', verticalAlign: 'middle' };

