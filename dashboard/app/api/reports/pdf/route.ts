import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  bookings,
  products,
  productOptions,
  guides,
  tourGroups,
  travellers,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { todayRome } from "@/lib/types";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Column widths (mm) — total ≈ 267 mm, fits landscape A4 (277 mm printable) ──
const COL_WIDTHS = {
  no: 8,
  tour: 35,
  date: 22,
  bookTime: 18,
  time: 16,
  pax: 10,
  first: 28,
  last: 28,
  age: 14,
  phone: 28,
  notes: 28,
} as const;

// ─── Palette ─────────────────────────────────────────────────────────────────
const DARK: [number, number, number] = [30, 30, 30];
const HEADER_BAND: [number, number, number] = [52, 73, 94]; // steel-blue
const ALT_A: [number, number, number] = [255, 255, 255];    // booking row group A
const ALT_B: [number, number, number] = [240, 245, 252];    // booking row group B (light blue)
const UNASSIGNED_BAND: [number, number, number] = [180, 60, 60];

type TravRow = {
  id: number;
  groupId: number | null;
  sortOrder: number;
  firstName: string;
  lastName: string;
  type: string;
  isLead: boolean;
  bookingId: number;
  bookedTime: string | null;
  phone: string;
  notes: string;
};

type GroupRow = {
  id: number;
  sortOrder: number;
  productName: string;
  optionName: string | null;
  departureTime: string | null;
  guideName: string | null;
  capacity: number;
};

// ─── Format HH:MM from a DB time string ──────────────────────────────────────
function hhmm(t: string | null | undefined): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

// ─── Add "Page N of Total" footer to every page ───────────────────────────────
function addPageNumbers(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${total}`, pageW / 2, pageH - 6, { align: "center" });
  }
}

// ─── Draw the group header band ───────────────────────────────────────────────
function drawGroupBand(
  doc: jsPDF,
  y: number,
  label: string,
  isUnassigned: boolean
): void {
  const color = isUnassigned ? UNASSIGNED_BAND : HEADER_BAND;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(14, y, pageW - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(label, 17, y + 5.8);
  doc.setTextColor(0, 0, 0);
}

// ─── One autoTable block ──────────────────────────────────────────────────────
function renderTable(
  doc: jsPDF,
  startY: number,
  body: string[][],
  rowFills: [number, number, number][],
  isUnassigned: boolean
): number {
  const headFill = isUnassigned ? UNASSIGNED_BAND : DARK;

  autoTable(doc, {
    startY,
    head: [
      [
        "No",
        "Type of Tour",
        "Date",
        "Booking Time",
        "Time",
        "Pax",
        "First Name",
        "Last Name",
        "Age",
        "Phone",
        "Notes",
      ],
    ],
    body,
    styles: {
      fontSize: 11,
      cellPadding: 1.8,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.2,
      textColor: [0, 0, 0] as [number, number, number],
    },
    headStyles: {
      fillColor: headFill,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: COL_WIDTHS.no, halign: "center" },
      1: { cellWidth: COL_WIDTHS.tour },
      2: { cellWidth: COL_WIDTHS.date, halign: "center" },
      3: { cellWidth: COL_WIDTHS.bookTime, halign: "center" },
      4: { cellWidth: COL_WIDTHS.time, halign: "center" },
      5: { cellWidth: COL_WIDTHS.pax, halign: "center" },
      6: { cellWidth: COL_WIDTHS.first },
      7: { cellWidth: COL_WIDTHS.last },
      8: { cellWidth: COL_WIDTHS.age, halign: "center" },
      9: { cellWidth: COL_WIDTHS.phone },
      10: { cellWidth: COL_WIDTHS.notes },
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.fillColor = rowFills[data.row.index] ?? ALT_A;
      }
    },
  });

  // @ts-expect-error jspdf-autotable augments doc at runtime
  return (doc.lastAutoTable.finalY as number) + 6;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = new URL(request.url).searchParams.get("date") || todayRome();

    // ── Query A — tour groups for the day ─────────────────────────────────────
    const groupRows: GroupRow[] = (
      await db
        .select({
          id: tourGroups.id,
          sortOrder: tourGroups.sortOrder,
          productName: products.shortName,
          optionName: productOptions.name,
          departureTime: tourGroups.departureTime,
          guideName: guides.name,
          capacity: sql<number>`COALESCE(${tourGroups.capacity}, ${productOptions.capacity}, 7)`,
        })
        .from(tourGroups)
        .innerJoin(products, eq(tourGroups.productId, products.id))
        .leftJoin(productOptions, eq(tourGroups.productOptionId, productOptions.id))
        .leftJoin(guides, eq(tourGroups.guideId, guides.id))
        .where(eq(tourGroups.serviceDate, date))
        .orderBy(asc(tourGroups.sortOrder)) as any[]
    ).map((r) => ({ ...r, capacity: Number(r.capacity) }));

    // ── Query B — all travellers for the day ──────────────────────────────────
    const travRows: TravRow[] = await db
      .select({
        id: travellers.id,
        groupId: travellers.groupId,
        sortOrder: travellers.sortOrder,
        firstName: travellers.firstName,
        lastName: travellers.lastName,
        type: travellers.type,
        isLead: travellers.isLead,
        bookingId: bookings.id,
        bookedTime: bookings.startTime,
        phone: bookings.phone,
        notes: bookings.notes,
      })
      .from(travellers)
      .innerJoin(bookings, eq(travellers.bookingId, bookings.id))
      .where(and(eq(bookings.serviceDate, date), isNull(bookings.archivedAt)))
      .orderBy(asc(bookings.id), asc(travellers.sortOrder));

    // ── per-group pax count ───────────────────────────────────────────────────
    const groupPax = new Map<number, number>();
    for (const t of travRows) {
      if (t.groupId !== null)
        groupPax.set(t.groupId, (groupPax.get(t.groupId) || 0) + 1);
    }

    // ── per-booking-per-group pax count ──────────────────────────────────────
    const bkgInGroup = new Map<string, number>();
    for (const t of travRows) {
      const k = `${t.bookingId}:${t.groupId ?? "u"}`;
      bkgInGroup.set(k, (bkgInGroup.get(k) || 0) + 1);
    }

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const genLabel = `Generated: ${new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Rome",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    // Page title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text("SOLE — Daily Manifest", pageW / 2, 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(dateLabel, pageW / 2, 19, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(genLabel, pageW - 14, 12, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Continuous row counter
    let no = 1;
    let curY = 26;

    // ── Helper: build body + rowFills for a slice of travellers ──────────────
    function buildBody(
      members: TravRow[],
      tourLabel: string,
      departureTime: string | null
    ): { body: string[][]; rowFills: [number, number, number][] } {
      const seen = new Set<number>();
      let alt = false;
      const body: string[][] = [];
      const rowFills: [number, number, number][] = [];

      for (const t of members) {
        const isFirst = !seen.has(t.bookingId);
        if (isFirst) {
          seen.add(t.bookingId);
          alt = !alt;
        }
        rowFills.push(alt ? ALT_A : ALT_B);

        body.push([
          String(no++),
          isFirst ? tourLabel : "",
          date,
          hhmm(t.bookedTime),
          isFirst ? hhmm(departureTime) : "",
          isFirst
            ? String(bkgInGroup.get(`${t.bookingId}:${t.groupId ?? "u"}`) ?? 1)
            : "",
          t.firstName,
          t.lastName,
          t.type === "Child" || t.type === "Infant" ? "Child" : "Adult",
          isFirst ? t.phone : "",
          isFirst ? t.notes : "",
        ]);
      }

      return { body, rowFills };
    }

    // ── Render assigned groups ────────────────────────────────────────────────
    for (let i = 0; i < groupRows.length; i++) {
      const g = groupRows[i];
      const members = travRows
        .filter((t) => t.groupId === g.id)
        .sort((a, b) => a.bookingId - b.bookingId || a.sortOrder - b.sortOrder);

      if (members.length === 0) continue;

      // Page break check
      if (curY > 175) {
        doc.addPage();
        curY = 14;
      }

      const current = groupPax.get(g.id) ?? 0;
      const tourLabel = g.optionName
        ? `${g.productName} · ${g.optionName}`
        : g.productName;
      const bandLabel = [
        `GROUP ${i + 1}`,
        tourLabel,
        `Guide: ${g.guideName ?? "—"}`,
        `Departure: ${hhmm(g.departureTime)}`,
        `${current}/${g.capacity} pax`,
      ].join("   |   ");

      drawGroupBand(doc, curY, bandLabel, false);
      curY += 10;

      const { body, rowFills } = buildBody(members, tourLabel, g.departureTime);
      curY = renderTable(doc, curY, body, rowFills, false);
    }

    // ── Render unassigned section ─────────────────────────────────────────────
    const unassigned = travRows
      .filter((t) => t.groupId === null)
      .sort((a, b) => a.bookingId - b.bookingId || a.sortOrder - b.sortOrder);

    if (unassigned.length > 0) {
      if (curY > 175) {
        doc.addPage();
        curY = 14;
      }

      const bandLabel = `UNASSIGNED   |   Not yet placed in a group   |   ${unassigned.length} pax`;
      drawGroupBand(doc, curY, bandLabel, true);
      curY += 10;

      const { body, rowFills } = buildBody(unassigned, "", null);
      curY = renderTable(doc, curY, body, rowFills, true);
    }

    // ── Page numbers (post-hoc, after all pages are known) ───────────────────
    addPageNumbers(doc);

    // ── Return PDF ────────────────────────────────────────────────────────────
    const pdf = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="manifest-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF manifest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
