import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import {
  Btn, C, Empty, Hov, Input, MONO, Section, SectionHead, Select, Textarea, useToast,
} from '../ui/kit';
import { commit } from '../lib/store';
import { today, uid } from '../utils/dates';
import { fillTemplate, productName, templateVars } from '../utils/selectors';
import { copyText } from '../utils/exports';
import type { Template } from '../types';
import type { ViewProps } from './types';

const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'it', label: 'Italiano' },
] as const;

type LangId = (typeof LANGS)[number]['id'];

const STAGE_LABELS = [
  'Ad hoc', 'Stage 1 · names', 'Stage 2 · confirm', 'Stage 3 · time', 'Stage 4 · review',
];

const PLACEHOLDERS = ['lead', 'tour', 'ref', 'date', 'time', 'guide', 'pax'];

export function MessagesView({ store, setConfirm }: ViewProps) {
  const toast = useToast();
  const t = today();

  const [selectedId, setSelectedId] = useState<string>(() => store.templates[0]?.id ?? '');
  const [lang, setLang] = useState<LangId>('en');
  const [draft, setDraft] = useState<Template | null>(null);
  const [previewRef, setPreviewRef] = useState('');

  const selected = store.templates.find(x => x.id === selectedId) ?? store.templates[0] ?? null;

  useEffect(() => {
    if (!selectedId && store.templates[0]) setSelectedId(store.templates[0].id);
  }, [store.templates, selectedId]);

  // Discard an in-flight edit when the operator switches template.
  useEffect(() => { setDraft(null); }, [selectedId]);

  const working = draft ?? selected;
  const dirty = draft !== null && selected !== null &&
    JSON.stringify(draft) !== JSON.stringify(selected);

  const upcoming = useMemo(
    () => store.bookings
      .filter(b => b.date >= t && b.status !== 'Cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 60),
    [store.bookings, t],
  );

  const previewBooking = upcoming.find(b => b.ref === previewRef) ?? upcoming[0] ?? null;

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  const body = working ? (working[lang] || working.en) : '';
  const previewVars = templateVars(store.products, previewBooking);
  const rendered = fillTemplate(body, previewVars);

  /* The client's time-coordination message lost its date and time when the
     placeholder chips appended to the end instead of the caret, and nothing
     said so. A message that tells a traveller to turn up without saying when
     is worth flagging. */
  const missingWhen = body.trim().length > 0
    && !/\{(date|travelDate)\}/.test(body)
    && !/\{(time|tourTime)\}/.test(body);

  const edit = (patch: Partial<Template>) => {
    if (!working) return;
    setDraft({ ...working, ...patch });
  };

  /**
   * Drop a placeholder where the caret is.
   *
   * This used to append to the end of the message, which made the chips
   * useless: every {date} and {time} landed after the sign-off and had to be
   * cut and pasted back into the sentence. The chip suppresses mousedown so
   * the textarea never loses its selection, splices at the caret (replacing
   * any highlighted text), then restores focus with the caret sitting just
   * after what was inserted, ready to keep typing.
   */
  const insertPlaceholder = (name: string) => {
    if (!working) return;
    const el = bodyRef.current;
    const token = `{${name}}`;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);

    // Park the caret target; the effect below applies it *after* React has
    // committed the new value. Doing it in a rAF races the re-render, which
    // puts the caret back at the end of the textarea.
    pendingCaret.current = start + token.length;
    edit({ [lang]: next } as Partial<Template>);
  };

  useEffect(() => {
    const at = pendingCaret.current;
    if (at == null) return;
    pendingCaret.current = null;
    const node = bodyRef.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(at, at);
  }, [body]);

  const save = () => {
    if (!draft) return;
    commit({ templates: store.templates.map(x => (x.id === draft.id ? draft : x)) });
    setDraft(null);
    toast('Template saved');
  };

  const addTemplate = () => {
    const tpl: Template = {
      id: uid('tpl'), stage: 0, name: 'New template', when: 'Any time',
      en: '', es: '', it: '',
    };
    commit({ templates: [...store.templates, tpl] });
    setSelectedId(tpl.id);
    toast('Template added');
  };

  const duplicate = () => {
    if (!working) return;
    const copy: Template = { ...working, id: uid('tpl'), name: `${working.name} (copy)` };
    commit({ templates: [...store.templates, copy] });
    setSelectedId(copy.id);
    toast('Template duplicated');
  };

  const remove = () => {
    if (!working) return;
    setConfirm({
      title: 'Delete this template?',
      body: `“${working.name}” is removed for everyone on the team. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      run: () => {
        const rest = store.templates.filter(x => x.id !== working.id);
        commit({ templates: rest });
        setSelectedId(rest[0]?.id ?? '');
        toast('Template deleted');
      },
    });
  };

  const sendNow = () => {
    if (!previewBooking) { toast('Pick a booking to send to.', 'warn'); return; }
    const digits = previewBooking.phone.replace(/[^\d]/g, '');
    if (!digits) {
      void copyText(rendered).then(ok =>
        toast(ok ? 'No phone number — message copied instead' : 'No phone number on that booking',
          ok ? 'warn' : 'bad'));
      return;
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(rendered)}`, '_blank', 'noopener');
  };

  return (
    <div data-r="split" style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)',
      gap: 14, alignItems: 'start',
    }}>
      {/* ── template list ── */}
      <Section>
        <SectionHead title="Templates" note={`${store.templates.length}`}>
          <Btn small icon="plus" onClick={addTemplate}>New</Btn>
        </SectionHead>

        {!store.templates.length && <Empty pad={24}>No templates yet.</Empty>}

        {store.templates.map(tpl => {
          const on = tpl.id === selectedId;
          return (
            <Hov
              key={tpl.id}
              as="button"
              type="button"
              onClick={() => setSelectedId(tpl.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', border: 0,
                borderLeft: `3px solid ${on ? C.accent : 'transparent'}`,
                borderBottom: `1px solid ${C.lineFaint}`,
                background: on ? C.accentWash : C.panel, padding: '10px 13px',
                cursor: 'pointer', textAlign: 'left',
              }}
              hover={on ? undefined : { background: C.wash }}
            >
              <span style={{
                width: 20, height: 20, flexShrink: 0, borderRadius: 5,
                background: on ? C.ink : '#f0f2f5', color: on ? '#fff' : C.muted2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>
                {tpl.stage || '·'}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: 12, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {tpl.name}
                </span>
                <span style={{ fontSize: 10.5, color: C.muted }}>{tpl.when || 'Any time'}</span>
              </span>
            </Hov>
          );
        })}
      </Section>

      {/* ── editor + preview ── */}
      {!working && (
        <Section><Empty pad={40}>Select a template on the left.</Empty></Section>
      )}

      {working && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Section>
            <SectionHead title="Template">
              <Btn small icon="copy" onClick={duplicate}>Duplicate</Btn>
              <Btn small icon="trash" onClick={remove} hover={{ borderColor: '#e0a3b3', color: C.bad }}>
                Delete
              </Btn>
              <Btn small variant="primary" onClick={save} disabled={!dirty}>
                {dirty ? 'Save' : 'Saved'}
              </Btn>
            </SectionHead>

            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div data-r="fields" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <MicroLabel>Name</MicroLabel>
                  <Input value={working.name} onChange={(e: any) => edit({ name: e.target.value })} />
                </label>
                <label style={{ width: 170, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <MicroLabel>Workflow stage</MicroLabel>
                  <Select
                    value={String(working.stage)}
                    onChange={(e: any) => edit({ stage: Number(e.target.value) })}
                    options={STAGE_LABELS.map((l, i) => ({ v: String(i), t: l }))}
                    style={{ background: C.panel }}
                  />
                </label>
                <label style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <MicroLabel>Sent when</MicroLabel>
                  <Input value={working.when} onChange={(e: any) => edit({ when: e.target.value })} />
                </label>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                  <div style={{
                    display: 'flex', border: `1px solid ${C.line}`,
                    borderRadius: 6, overflow: 'hidden',
                  }}>
                    {LANGS.map(l => {
                      const on = lang === l.id;
                      return (
                        <Hov
                          key={l.id}
                          as="button"
                          type="button"
                          onClick={() => setLang(l.id)}
                          style={{
                            border: 0, borderRight: `1px solid ${C.lineSoft}`, padding: '5px 12px',
                            fontSize: 11.5, fontWeight: on ? 600 : 500, cursor: 'pointer',
                            background: on ? C.ink : C.panel, color: on ? '#fff' : C.body,
                          }}
                          hover={on ? undefined : { background: C.paper }}
                        >
                          {l.label}
                        </Hov>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10.5, color: C.muted }}>Placeholders:</span>
                  {PLACEHOLDERS.map(p => (
                    <Hov
                      key={p}
                      as="button"
                      type="button"
                      title={
                        previewVars[p]
                          ? `Insert {${p}} — renders as “${previewVars[p]}”`
                          : `Insert {${p}}`
                      }
                      onMouseDown={(e: any) => e.preventDefault()}
                      onClick={() => insertPlaceholder(p)}
                      style={{
                        fontFamily: MONO, fontSize: 10, border: `1px solid ${C.line}`,
                        background: C.wash, borderRadius: 4, padding: '1px 5px',
                        color: C.muted2, cursor: 'pointer',
                      }}
                      hover={{ borderColor: C.accent, color: C.accentInk, background: C.accentWash }}
                    >
                      {`{${p}}`}
                    </Hov>
                  ))}
                </div>

                <Textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e: any) => edit({ [lang]: e.target.value } as Partial<Template>)}
                  placeholder={`The ${LANGS.find(l => l.id === lang)?.label} version of this message`}
                  style={{ minHeight: 220, fontSize: 12.5, background: C.panel }}
                />

                {missingWhen && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8,
                    padding: '8px 11px', borderRadius: 6,
                    background: C.warnBg, border: `1px solid #f3e2c4`,
                  }}>
                    <Icon name="info" size={13} color={C.warn} style={{ marginTop: 1 }} />
                    <span style={{ fontSize: 11.5, color: C.warn, lineHeight: 1.5 }}>
                      This message has no date or time. Put the caret where you want them
                      and click <strong>{'{date}'}</strong> and <strong>{'{time}'}</strong> above —
                      they fill in from each booking when the message is sent.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section>
            <SectionHead title="Preview" note="rendered against a real booking">
              <Select
                value={previewBooking?.ref ?? ''}
                onChange={(e: any) => setPreviewRef(e.target.value)}
                options={
                  upcoming.length
                    ? upcoming.map(b => ({
                      v: b.ref,
                      t: `${b.travelers[0]?.[0] || b.ref} · ${b.date} · ${productName(store.products, b)}`,
                    }))
                    : [{ v: '', t: 'No upcoming bookings' }]
                }
                style={{ background: C.panel, width: 320, maxWidth: '100%', height: 28, fontSize: 11.5 }}
              />
              <Btn
                small
                icon="copy"
                onClick={() => {
                  void copyText(rendered).then(ok =>
                    toast(ok ? 'Message copied' : 'Copy was blocked', ok ? 'ok' : 'bad'));
                }}
              >
                Copy
              </Btn>
              <Btn
                small
                variant="primary"
                icon="message"
                onClick={sendNow}
                disabled={!previewBooking}
              >
                Send on WhatsApp
              </Btn>
            </SectionHead>

            <div style={{ padding: 14 }}>
              {!body.trim() && (
                <Empty pad={26}>
                  This language is empty. Type the message above, or leave it blank to fall back
                  to English.
                </Empty>
              )}

              {body.trim() && (
                <div style={{
                  background: '#e7f7ee', border: '1px solid #cfead9', borderRadius: 10,
                  borderTopLeftRadius: 2, padding: '11px 13px', maxWidth: 520,
                  fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', textWrap: 'pretty',
                }}>
                  {rendered}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    gap: 4, marginTop: 6, fontSize: 10, color: '#6c8a7b',
                  }}>
                    <Icon name="check" size={11} color="#6c8a7b" />
                    {previewBooking ? previewBooking.phone || 'no phone on file' : ''}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em',
      textTransform: 'uppercase', color: C.muted3,
    }}>
      {children}
    </span>
  );
}
