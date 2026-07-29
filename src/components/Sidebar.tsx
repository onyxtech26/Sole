import { useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '../ui/Icon';
import { C, Hov, MONO } from '../ui/kit';
import { canSee, type Screen } from '../utils/access';
import type { User } from '../types';

interface NavItem {
  id: Screen;
  label: string;
  icon: IconName;
  group: 'Daily work' | 'Setup';
}

const NAV: NavItem[] = [
  { id: 'portal', label: 'My tours', icon: 'route', group: 'Daily work' },
  { id: 'today', label: 'Dashboard', icon: 'dashboard', group: 'Daily work' },
  { id: 'bookings', label: 'Bookings', icon: 'calendarDays', group: 'Daily work' },
  { id: 'groups', label: 'Grouping', icon: 'rows', group: 'Daily work' },
  { id: 'manifests', label: 'Manifests', icon: 'fileText', group: 'Daily work' },
  { id: 'messages', label: 'Messages', icon: 'message', group: 'Daily work' },
  { id: 'crm', label: 'Customers', icon: 'users', group: 'Setup' },
  { id: 'tours', label: 'Tours', icon: 'layers', group: 'Setup' },
  { id: 'team', label: 'Team', icon: 'idCard', group: 'Setup' },
  { id: 'finance', label: 'Finance', icon: 'finance', group: 'Setup' },
];

/* The rail is what stays on screen; the panel expands over the content rather
   than pushing it, so hovering never reflows the table underneath. ICON_BOX is
   half the rail, which keeps every glyph on the rail's centre line and — since
   the box width never changes — perfectly still as the panel opens. */
const RAIL = 52;
const PANEL = 212;
const ICON_BOX = 36;

interface Props {
  user: User;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onSignOut: () => void;
  badges: Partial<Record<Screen, number>>;
}

export function Sidebar({ user, screen, onNavigate, onSignOut, badges }: Props) {
  const [open, setOpen] = useState(false);
  const visible = NAV.filter(n => canSee(user.role, n.id));
  const groups: NavItem['group'][] = ['Daily work', 'Setup'];

  /* Everything that is not a glyph fades out with the rail. The panel clips,
     so the text is already gone before the width finishes animating. */
  const fade = (extra?: CSSProperties): CSSProperties => ({
    opacity: open ? 1 : 0,
    // A few pixels of travel makes the label look like it slid out from behind
    // the icon rather than simply materialising on top of it.
    transform: open ? 'translateX(0)' : 'translateX(-6px)',
    transition: 'opacity .2s ease, transform .26s var(--ease)',
    whiteSpace: 'nowrap',
    pointerEvents: open ? undefined : 'none',
    ...extra,
  });

  return (
    <aside
      data-r="side"
      data-print="hide"
      style={{ width: RAIL, flexShrink: 0, position: 'relative' }}
    >
      <div
        data-r="sidepanel"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: open ? PANEL : RAIL,
          background: C.ink, color: '#fff', zIndex: 45,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'width .24s var(--ease), box-shadow .24s ease',
          boxShadow: open ? '6px 0 28px rgba(11,18,32,.22)' : 'none',
        }}
      >
        <div
          data-r="brand"
          style={{
            height: 54, flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 8px', borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <span style={{
            width: ICON_BOX, flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src="/logo-mark.png"
              alt=""
              style={{ height: 18, width: 'auto', display: 'block' }}
            />
          </span>
          <span className="side-label" style={fade({ display: 'flex', flexDirection: 'column', gap: 2 })}>
            <span style={{
              fontSize: 13, fontWeight: 600, letterSpacing: '.18em', lineHeight: 1,
            }}>
              SOLE
            </span>
            <span style={{
              fontSize: 7.5, fontWeight: 500, letterSpacing: '.15em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,.38)', lineHeight: 1,
            }}>
              Sun Tours Travels
            </span>
          </span>
        </div>

        <nav
          data-r="sidenav"
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}
        >
          {groups.map(g => {
            const items = visible.filter(n => n.group === g);
            if (!items.length) return null;
            return (
              <div key={g} style={{ display: 'contents' }}>
                <div
                  data-r="navgroup"
                  className="side-label"
                  style={fade({
                    fontSize: 8.5, fontWeight: 600, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,.3)',
                    padding: g === 'Setup' ? '16px 10px 6px' : '5px 10px 6px',
                  })}
                >
                  {g}
                </div>

                {items.map(n => {
                  const on = screen === n.id;
                  const badge = badges[n.id];
                  return (
                    <Hov
                      key={n.id}
                      as="button"
                      type="button"
                      className="nav-item"
                      onClick={() => onNavigate(n.id)}
                      aria-current={on ? 'page' : undefined}
                      title={open ? undefined : n.label}
                      style={{
                        position: 'relative', display: 'flex', alignItems: 'center',
                        width: '100%', border: 0, padding: '8px 0', borderRadius: 6,
                        fontSize: 12.5, cursor: 'pointer', textAlign: 'left', flexShrink: 0,
                        background: on ? 'rgba(255,255,255,.1)' : 'transparent',
                        color: on ? '#fff' : 'rgba(255,255,255,.62)',
                        fontWeight: on ? 600 : 400,
                      }}
                      hover={on ? undefined : { background: 'rgba(255,255,255,.07)', color: '#fff' }}
                    >
                      {on && (
                        <span style={{
                          position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
                          borderRadius: '0 3px 3px 0', background: C.accent,
                        }} />
                      )}

                      <span style={{
                        width: ICON_BOX, flexShrink: 0, position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={n.icon} size={15} />
                        {/* Collapsed, the count has nowhere to go — a dot still says
                            "something in here needs you". */}
                        {!!badge && !open && (
                          <span style={{
                            position: 'absolute', top: -1, right: 3, width: 6, height: 6,
                            borderRadius: '50%', background: C.accent,
                            border: `1.5px solid ${C.ink}`,
                          }} />
                        )}
                      </span>

                      <span className="side-label" style={fade({ flex: 1 })}>{n.label}</span>

                      {!!badge && (
                        <span className="side-label" style={fade({
                          fontFamily: MONO, fontSize: 9.5, fontWeight: 500, padding: '1px 5px',
                          borderRadius: 4, background: 'rgba(253,151,7,.16)', color: '#fdb44e',
                        })}>
                          {badge}
                        </span>
                      )}

                      <span style={{ width: 10, flexShrink: 0 }} />
                    </Hov>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div
          data-r="sidefoot"
          style={{ flexShrink: 0, padding: 8, borderTop: '1px solid rgba(255,255,255,.08)' }}
        >
          <Hov
            as="button"
            type="button"
            onClick={onSignOut}
            title={`Sign out (${user.username})`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 0,
              background: 'transparent', padding: '7px 0', borderRadius: 6, cursor: 'pointer',
              textAlign: 'left', color: 'rgba(255,255,255,.6)',
            }}
            hover={{ background: 'rgba(255,255,255,.07)' }}
          >
            <span style={{
              width: ICON_BOX, flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 5, background: C.accent,
                color: C.ink, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10.5, fontWeight: 700,
              }}>
                {user.initial}
              </span>
            </span>

            <span className="side-label" style={fade({
              flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
            })}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                {user.name}
              </span>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.4)', lineHeight: 1.3 }}>
                {user.roleLabel}
              </span>
            </span>

            <span className="side-label" style={fade({ display: 'flex', paddingRight: 9 })}>
              <Icon name="logout" size={13} />
            </span>
          </Hov>

          <p className="side-label" style={fade({
            margin: '6px 9px 2px', fontSize: 9, color: 'rgba(255,255,255,.3)',
          })}>
            Powered by{' '}
            <a
              href="https://onyxx-tech.vercel.app/index.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(253,151,7,.75)' }}
            >
              Onyxx Tech Hub
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}
