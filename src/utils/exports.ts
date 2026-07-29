/* File output: clipboard, CSV, XLSX and PDF. The heavy libraries are imported
   lazily so they never sit in the first chunk. */

import type { ManifestBand } from './selectors';
import { longDate } from './dates';

export function download(name: string, data: BlobPart, mime = 'text/csv;charset=utf-8'): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

const csvCell = (c: unknown): string =>
  '"' + String(c ?? '').replace(/"/g, '""') + '"';

export const toCsv = (rows: unknown[][]): string =>
  rows.map(r => r.map(csvCell).join(',')).join('\n');

/* ── manifests ──────────────────────────────────────────────────────────── */
const MANIFEST_HEAD = [
  'Group', 'Tour', 'Option', 'Time', 'Guide', 'Guide phone',
  'No', 'Reference', 'Name', 'Age', 'Role', 'Phone', 'Language',
];

export function manifestCsv(bands: ManifestBand[]): string {
  const lines: unknown[][] = [MANIFEST_HEAD];
  for (const g of bands) {
    for (const r of g.rows) {
      lines.push([
        g.no, g.tour, `${g.tg} ${g.tgTitle}`, g.time, g.guide, g.guidePhone,
        r.no, r.ref, r.name, r.age, r.role, r.phone, r.lang,
      ]);
    }
  }
  return toCsv(lines);
}

export function manifestText(bands: ManifestBand[], date: string): string {
  const head = `Sun Tours Travels — manifest ${longDate(date)}`;
  if (!bands.length) return `${head}\nNo grouped departures.`;
  return (
    head + '\n\n' +
    bands
      .map(g =>
        `GRP ${g.no} · ${g.tour} (${g.tg}) · ${g.time} · ${g.guide} ${g.guidePhone} · ${g.fill}\n` +
        g.rows
          .map(r => `  ${r.no}. ${r.name} (${r.age})${r.phone ? ` · ${r.phone}` : ''}`)
          .join('\n'),
      )
      .join('\n\n')
  );
}

async function newPdf(orientation: 'p' | 'l' = 'p') {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  return { doc, autoTable };
}

const BRAND: [number, number, number] = [11, 18, 32];
const ACCENT: [number, number, number] = [253, 151, 7];

export async function manifestPdf(bands: ManifestBand[], date: string): Promise<Blob> {
  const { doc, autoTable } = await newPdf('p');
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 58, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SOLE', 40, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 197, 208);
  doc.text('Sun Tours Travels · daily manifest', 40, 42);
  doc.setTextColor(...ACCENT);
  doc.setFontSize(10);
  doc.text(longDate(date), W - 40, 34, { align: 'right' });

  let y = 78;

  if (!bands.length) {
    doc.setTextColor(120, 128, 140);
    doc.setFontSize(11);
    doc.text('No grouped departures for this day.', 40, y);
    return doc.output('blob');
  }

  for (const g of bands) {
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Group ${g.no} · ${g.tour} (${g.tg})`, 40, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 128, 140);
    doc.text(
      `${g.time} · ${g.tgTitle} · ${g.guide}${g.guidePhone ? ` ${g.guidePhone}` : ''} · ${g.fill}`,
      40, y + 13,
    );

    autoTable(doc, {
      startY: y + 22,
      head: [['#', 'Name', 'Age', 'Role', 'Reference', 'Phone', 'Lang']],
      body: g.rows.map(r => [r.no, r.name, r.age, r.role, r.ref, r.phone, r.lang]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [229, 232, 237], textColor: [40, 48, 62] },
      headStyles: { fillColor: [246, 247, 249], textColor: [90, 98, 112], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 40 }, 3: { cellWidth: 48 }, 6: { cellWidth: 36 } },
      margin: { left: 40, right: 40 },
    });

    y = (doc as any).lastAutoTable.finalY + 26;
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 56;
    }
  }

  return doc.output('blob');
}

export interface SheetSpec {
  name: string;
  head: string[];
  rows: (string | number)[][];
}

/** Write one or more sheets to a real .xlsx workbook. */
export async function writeWorkbook(file: string, sheets: SheetSpec[]): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([s.head, ...s.rows]);
    ws['!cols'] = s.head.map((h, i) => ({
      wch: Math.min(42, Math.max(h.length + 2, ...s.rows.map(r => String(r[i] ?? '').length + 2))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  download(file, new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
}

export interface ReportSection {
  title: string;
  head: string[];
  rows: (string | number)[][];
}

/** Generic branded PDF used by the finance and bookings exports. */
export async function reportPdf(
  title: string, subtitle: string, sections: ReportSection[],
): Promise<Blob> {
  const { doc, autoTable } = await newPdf('l');
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 58, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SOLE', 40, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 197, 208);
  doc.text(title, 40, 42);
  doc.setTextColor(...ACCENT);
  doc.setFontSize(10);
  doc.text(subtitle, W - 40, 34, { align: 'right' });

  let y = 78;
  for (const s of sections) {
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(s.title, 40, y);

    autoTable(doc, {
      startY: y + 10,
      head: [s.head],
      body: s.rows,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [229, 232, 237], textColor: [40, 48, 62] },
      headStyles: { fillColor: [246, 247, 249], textColor: [90, 98, 112], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      margin: { left: 40, right: 40 },
    });

    y = (doc as any).lastAutoTable.finalY + 24;
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 56;
    }
  }

  return doc.output('blob');
}
