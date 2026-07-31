import { useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import {
  Btn, C, Empty, Hov, Input, MONO, Modal, ModalFoot, ModalHead, Section, useToast,
} from '../ui/kit';
import { commit } from '../lib/store';
import { uploadFile } from '../lib/upload';
import { today } from '../utils/dates';
import { RollingNumber } from '../ui/RollingNumber';
import type { Product, ProductOption } from '../types';
import type { ViewProps } from './types';

export function ToursView({ store, setConfirm }: ViewProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const t = today();

  const usage = useMemo(() => {
    const m = new Map<string, { upcoming: number; pax: number }>();
    for (const b of store.bookings) {
      if (b.status === 'Cancelled') continue;
      const e = m.get(b.code) ?? { upcoming: 0, pax: 0 };
      if (b.date >= t) { e.upcoming += 1; e.pax += b.travelers.length; }
      m.set(b.code, e);
    }
    return m;
  }, [store.bookings, t]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.products.filter(p =>
      !q || p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q));
  }, [store.products, query]);

  const startNew = () => {
    setIsNew(true);
    setEditing({
      code: '', name: '', label: '', defaultCap: 7,
      options: [{ tg: 'TG1', title: 'Standard', cap: 7 }],
      image: '',
    });
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadFile('products', file);
      setEditing(e => (e ? { ...e, image: url } : e));
      toast('Photo attached — save the tour to keep it');
    } catch (err) {
      toast((err as Error).message || 'Upload failed', 'bad');
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  const save = () => {
    if (!editing) return;
    if (!editing.code.trim()) { toast('A product code is required.', 'bad'); return; }
    if (!editing.name.trim()) { toast('A short name is required.', 'bad'); return; }

    const clean: Product = {
      ...editing,
      code: editing.code.trim(),
      name: editing.name.trim(),
      label: editing.label.trim() || editing.name.trim(),
      options: editing.options.filter(o => o.tg.trim()),
    };

    const exists = store.products.some(p => p.code === clean.code);
    if (isNew && exists) { toast(`${clean.code} is already in the catalogue.`, 'bad'); return; }

    commit({
      products: exists
        ? store.products.map(p => (p.code === clean.code ? clean : p))
        : [...store.products, clean],
    });
    setEditing(null);
    toast(exists ? 'Tour saved' : 'Tour added');
  };

  const remove = (p: Product) => {
    const inUse = store.bookings.some(b => b.code === p.code);
    setConfirm({
      title: `Delete ${p.name}?`,
      body: inUse
        ? 'Bookings still reference this product code. They will keep working but will show the raw code instead of a name.'
        : 'It is removed from the shared catalogue for everyone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      run: () => {
        commit({ products: store.products.filter(x => x.code !== p.code) });
        toast('Tour deleted');
      },
    });
  };

  const setOption = (i: number, patch: Partial<ProductOption>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      options: editing.options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    });
  };

  return (
    <>
      <div data-r="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div data-grow style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Icon
            name="search"
            size={13}
            color={C.muted3}
            style={{ position: 'absolute', left: 9, pointerEvents: 'none' }}
          />
          <Input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Search a tour or product code"
            style={{ width: 260, paddingLeft: 28, background: C.panel }}
          />
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>
          <RollingNumber value={list.length} /> of{' '}
          <RollingNumber value={store.products.length} /> products
        </span>
        <div style={{ flex: 1 }} />
        <Btn variant="primary" icon="plus" style={{ padding: '6px 11px', fontSize: 12 }} onClick={startNew}>
          New tour
        </Btn>
      </div>

      {!list.length && (
        <Section><Empty pad={40}>No product matches that search.</Empty></Section>
      )}

      {/* One product per row rather than a card grid: the catalogue is read
          top-to-bottom when someone is looking for a tour code, and the nested
          options belong visually underneath their parent. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(p => {
          const u = usage.get(p.code);
          const openEditor = () => {
            setIsNew(false);
            setEditing({ ...p, options: p.options.map(o => ({ ...o })) });
          };
          return (
            <Section key={p.code} className="up lift-shadow">
              <div data-r="listrow" style={{
                display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 15px',
              }}>
                <Thumb src={p.image} name={p.name} />

                <span style={{
                  fontFamily: MONO, fontSize: 10.5, color: C.body, background: C.paper,
                  borderRadius: 5, padding: '3px 8px', flexShrink: 0, marginTop: 1,
                }}>
                  {p.code}
                </span>

                <div data-grow style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, textWrap: 'pretty' }}>
                    {p.name}
                  </h3>
                  <p style={{
                    margin: '3px 0 0', fontSize: 11.5, color: C.muted2,
                    lineHeight: 1.5, textWrap: 'pretty',
                  }}>
                    {p.label}
                  </p>
                </div>

                <span style={{
                  fontSize: 11, color: C.muted, flexShrink: 0,
                  whiteSpace: 'nowrap', marginTop: 2,
                }}>
                  <RollingNumber value={u?.upcoming ?? 0} style={{ color: C.ink, fontWeight: 700 }} />
                  {' '}bookings ·{' '}
                  <RollingNumber value={u?.pax ?? 0} style={{ color: C.ink, fontWeight: 700 }} />
                  {' '}pax
                </span>

                <div className="row-actions" style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <Hov
                    as="button"
                    type="button"
                    title="Edit"
                    onClick={openEditor}
                    style={iconBtn}
                    hover={{ borderColor: C.accent, color: C.ink }}
                  >
                    <Icon name="edit" size={12} />
                  </Hov>
                  <Hov
                    as="button"
                    type="button"
                    title="Delete"
                    onClick={() => remove(p)}
                    style={iconBtn}
                    hover={{ borderColor: '#e0a3b3', color: C.bad }}
                  >
                    <Icon name="trash" size={12} />
                  </Hov>
                </div>
              </div>

              <div style={{
                padding: '0 15px 12px', display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                {p.options.map(o => (
                  <div key={o.tg} style={{
                    display: 'flex', alignItems: 'center', gap: 9, fontSize: 11.5,
                    border: `1px solid ${C.lineFaint}`, background: C.wash,
                    borderRadius: 6, padding: '6px 10px',
                  }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 10, fontWeight: 600,
                      color: C.accentInk, flexShrink: 0,
                    }}>
                      {o.tg}
                    </span>
                    <span style={{
                      flex: 1, minWidth: 0, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {o.title}
                    </span>
                    <span style={{ fontSize: 10.5, color: C.muted, flexShrink: 0 }}>
                      max {o.cap}
                    </span>
                  </div>
                ))}

                <Hov
                  as="button"
                  type="button"
                  onClick={openEditor}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', border: `1px dashed ${C.border}`, background: 'transparent',
                    borderRadius: 6, padding: '6px 10px', fontSize: 11.5, fontWeight: 500,
                    color: C.muted, cursor: 'pointer',
                  }}
                  hover={{ borderColor: C.accent, color: C.ink }}
                >
                  <Icon name="plus" size={12} />
                  Add tour option
                </Hov>
              </div>
            </Section>
          );
        })}
      </div>

      {/* ── editor ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} width={520}>
        {editing && (
          <>
            <ModalHead
              title={isNew ? 'New tour' : editing.name || 'Edit tour'}
              sub="Product codes must match the Viator export so imports land on the right tour."
              onClose={() => setEditing(null)}
            />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div data-r="fields" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ width: 170, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Micro>Product code</Micro>
                  <Input
                    value={editing.code}
                    disabled={!isNew}
                    onChange={(e: any) => setEditing({ ...editing, code: e.target.value })}
                    placeholder="5524558P1"
                  />
                </label>
                <label style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Micro>Short name</Micro>
                  <Input
                    value={editing.name}
                    onChange={(e: any) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Colosseo guide"
                  />
                </label>
                <label style={{ width: 96, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Micro>Default cap</Micro>
                  <Input
                    type="number"
                    min={1}
                    value={String(editing.defaultCap)}
                    onChange={(e: any) => setEditing({ ...editing, defaultCap: Number(e.target.value) || 1 })}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Micro>Full title</Micro>
                <Input
                  value={editing.label}
                  onChange={(e: any) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Guided Tour of Colosseum, Roman Forum & Palatine Hill"
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Micro>Photo</Micro>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Thumb src={editing.image} name={editing.name} size={54} />
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void pickPhoto(e.target.files?.[0])}
                  />
                  <Btn
                    small
                    icon={uploading ? 'spinner' : 'upload'}
                    disabled={uploading}
                    onClick={() => photoInput.current?.click()}
                  >
                    {uploading ? 'Uploading…' : editing.image ? 'Replace photo' : 'Upload photo'}
                  </Btn>
                  {editing.image && !uploading && (
                    <Btn small onClick={() => setEditing({ ...editing, image: '' })}>Remove</Btn>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Micro>Tour options</Micro>
                  <div style={{ flex: 1 }} />
                  <Btn
                    small
                    icon="plus"
                    onClick={() => setEditing({
                      ...editing,
                      options: [...editing.options, {
                        tg: `TG${editing.options.length + 1}`,
                        title: '',
                        cap: editing.defaultCap,
                      }],
                    })}
                  >
                    Add option
                  </Btn>
                </div>

                {editing.options.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Input
                      value={o.tg}
                      onChange={(e: any) => setOption(i, { tg: e.target.value })}
                      placeholder="TG1"
                      style={{ width: 72, fontFamily: MONO, fontSize: 11.5 }}
                    />
                    <Input
                      value={o.title}
                      onChange={(e: any) => setOption(i, { title: e.target.value })}
                      placeholder="Semi Private (max 7 people)"
                      style={{ flex: 1 }}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={String(o.cap)}
                      onChange={(e: any) => setOption(i, { cap: Number(e.target.value) || 1 })}
                      style={{ width: 68 }}
                    />
                    <Hov
                      as="button"
                      type="button"
                      title="Remove option"
                      onClick={() => setEditing({
                        ...editing, options: editing.options.filter((_, j) => j !== i),
                      })}
                      style={{ ...iconBtn, width: 28, height: 30 }}
                      hover={{ borderColor: '#e0a3b3', color: C.bad }}
                    >
                      <Icon name="x" size={12} />
                    </Hov>
                  </div>
                ))}
              </div>
            </div>
            <ModalFoot>
              <Btn onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={save}>Save tour</Btn>
            </ModalFoot>
          </>
        )}
      </Modal>
    </>
  );
}

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, border: `1px solid ${C.line}`, background: C.panel,
  borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: C.body, padding: 0,
};

/**
 * Product photo, falling back to the initial so a row never collapses — and
 * falling back the same way when the bucket object behind the URL is gone.
 */
function Thumb({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box: React.CSSProperties = {
    width: size, height: size, flexShrink: 0, borderRadius: 7,
    border: `1px solid ${C.line}`,
  };
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{ ...box, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <div style={{
      ...box, background: C.ink, color: C.accent, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.4), fontWeight: 700,
    }}>
      {(name.trim()[0] || '?').toUpperCase()}
    </div>
  );
}

function Micro({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em',
      textTransform: 'uppercase', color: C.muted3,
    }}>
      {children}
    </span>
  );
}
