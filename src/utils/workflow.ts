// The four-step message workflow attached to every reservation.
//
// Shared by the Reservations table (compact N/C/T/R toggles) and the booking
// form (full checklist), so the stages, their order and the template they
// compose from are defined in exactly one place.

import { Booking } from '../types';
import { loadWhatsappTemplates, fillTemplate } from './whatsappTemplates';

export const WORKFLOW_STEPS = [
  { key: 'N', label: 'Name collected', templateId: 'nameCollect' },
  { key: 'C', label: 'Confirmed', templateId: 'confirm' },
  { key: 'T', label: 'Time coordination sent', templateId: 'coordinationKiosk' },
  { key: 'R', label: 'Review requested', templateId: 'review' },
] as const;

/** Always a length-4 array of 0/1, whatever shape the record arrived in. */
export const wfOf = (b: Pick<Booking, 'workflow'>): number[] =>
  [0, 1, 2, 3].map(i => (b.workflow?.[i] ? 1 : 0));

/** A copy of `wf` with step `index` flipped. */
export const toggleWf = (wf: number[], index: number): number[] => {
  const next = [0, 1, 2, 3].map(i => (wf[i] ? 1 : 0));
  next[index] = next[index] ? 0 : 1;
  return next;
};

/**
 * Open WhatsApp with this stage's template pre-filled in the traveler's
 * language. Falls back to copying the message when the booking has no phone
 * number, so the text is never simply lost.
 */
export function composeWorkflowMessage(b: Booking, index: number): void {
  const templates = loadWhatsappTemplates();
  const step = WORKFLOW_STEPS[index];
  const tpl = templates.find(t => t.id === step.templateId) || templates[index] || templates[0];
  if (!tpl) {
    alert('No WhatsApp template is set up yet. Add one under the Schedule Board template manager.');
    return;
  }

  const lang = (b.language || 'English').toLowerCase();
  const raw = lang.startsWith('sp') || lang.startsWith('es')
    ? (tpl.es || tpl.en)
    : lang.startsWith('it')
      ? (tpl.it || tpl.en)
      : tpl.en;

  const body = fillTemplate(raw, {
    leadTraveler: b.leadTraveler || '',
    tourName: b.tourName || '',
    bookingRef: b.bookingRef || '',
    travelDate: b.travelDate || '',
    tourTime: b.tourTime || '',
  });

  const digits = (b.phone || '').replace(/[^\d]/g, '');
  if (!digits) {
    void navigator.clipboard?.writeText(body).then(
      () => alert('This booking has no phone number — the message was copied to your clipboard instead.'),
      () => alert('This booking has no phone number.')
    );
    return;
  }
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
}
