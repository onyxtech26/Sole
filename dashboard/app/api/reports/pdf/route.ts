import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, productOptions, guides, tourGroups, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { todayRome, formatMoney } from "@/lib/types";
import { and, eq, isNull, asc } from "drizzle-orm";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const date = new URL(request.url).searchParams.get("date") || todayRome();

    const groupRows = await db
      .select({
        id: tourGroups.id, sortOrder: tourGroups.sortOrder,
        productName: products.shortName, optionName: productOptions.name,
        departureTime: tourGroups.departureTime, ticketTime: tourGroups.ticketTime,
        ticketStatus: tourGroups.ticketStatus, guideName: guides.name,
      })
      .from(tourGroups)
      .innerJoin(products, eq(tourGroups.productId, products.id))
      .leftJoin(productOptions, eq(tourGroups.productOptionId, productOptions.id))
      .leftJoin(guides, eq(tourGroups.guideId, guides.id))
      .where(eq(tourGroups.serviceDate, date))
      .orderBy(asc(tourGroups.sortOrder));

    const travRows = await db
      .select({
        id: travellers.id, groupId: travellers.groupId, sortOrder: travellers.sortOrder,
        firstName: travellers.firstName, lastName: travellers.lastName, type: travellers.type,
        grossCents: travellers.grossCents, costCents: travellers.costCents,
        bookingId: bookings.id, bookingRef: bookings.reference, bookedTime: bookings.startTime, phone: bookings.phone,
      })
      .from(travellers)
      .innerJoin(bookings, eq(travellers.bookingId, bookings.id))
      .where(and(eq(bookings.serviceDate, date), isNull(bookings.archivedAt)))
      .orderBy(asc(travellers.sortOrder));

    const partySize = new Map<number, number>();
    const inGroup = new Map<string, number>();
    for (const t of travRows) partySize.set(t.bookingId, (partySize.get(t.bookingId) || 0) + 1);
    for (const t of travRows) {
      const k = `${t.bookingId}:${t.groupId ?? "u"}`;
      inGroup.set(k, (inGroup.get(k) || 0) + 1);
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("SOLE — Sun Tours Travels · Daily Manifest", 14, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(dateLabel, 14, 22);

    let no = 1;
    let y = 28;
    let totalGross = 0, totalCost = 0, adults = 0, children = 0, infants = 0;

    const renderGroup = (
      title: string, sub: string, guide: string, members: typeof travRows,
    ) => {
      if (y > 180) { doc.addPage(); y = 16; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(title, 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`${sub}    Guide: ${guide}    ${members.length} pax`, 14, y + 5);

      autoTable(doc, {
        startY: y + 8,
        head: [["No", "Booked", "Name", "Last name", "Age", "Telephone", "✓"]],
        body: members.map((t) => {
          const size = partySize.get(t.bookingId) || 1;
          const here = inGroup.get(`${t.bookingId}:${t.groupId ?? "u"}`) || 1;
          const split = here < size ? `  (${here} of ${size} · ${t.bookingRef})` : "";
          totalGross += t.grossCents; totalCost += t.costCents;
          if (t.type === "Adult") adults++; else if (t.type === "Child") children++; else infants++;
          return [
            String(no++),
            (t.bookedTime || "").slice(0, 5),
            t.firstName + split,
            t.lastName,
            t.type,
            t.phone || "",
            "",
          ];
        }),
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: [38, 38, 38], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 16 }, 4: { cellWidth: 14 }, 6: { cellWidth: 8 } },
        theme: "grid",
        margin: { left: 14, right: 14 },
      });
      // @ts-expect-error autotable augments doc
      y = doc.lastAutoTable.finalY + 8;
    };

    for (const g of groupRows) {
      const members = travRows.filter((t) => t.groupId === g.id);
      const grpNo = groupRows.indexOf(g) + 1;
      renderGroup(
        `GRP ${grpNo} — ${g.productName}${g.optionName ? " · " + g.optionName : ""}`,
        `Departs ${g.departureTime?.slice(0, 5) || "—"}   Ticket ${g.ticketTime?.slice(0, 5) || "—"}   ${g.ticketStatus}`,
        g.guideName || "—",
        members,
      );
    }

    const unassigned = travRows.filter((t) => t.groupId === null);
    if (unassigned.length) renderGroup("UNASSIGNED", "Not yet placed in a group", "—", unassigned);

    // Management summary
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Summary", 14, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(
      `Groups: ${groupRows.length}    Travellers: ${travRows.length} (${adults} adult, ${children} child, ${infants} infant)    ` +
        `Revenue: ${formatMoney(totalGross)}    Cost: ${formatMoney(totalCost)}    Balance: ${formatMoney(totalGross - totalCost)}`,
      14, y + 6,
    );

    const pdf = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sole-manifest-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
