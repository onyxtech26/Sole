import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import type { BookingInput } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number((await params).id);

    const bookingRow = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), isNull(bookings.archivedAt)))
      .limit(1);

    if (bookingRow.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRow[0];

    const travellerRows = await db
      .select()
      .from(travellers)
      .where(eq(travellers.bookingId, id))
      .orderBy(travellers.sortOrder);

    return NextResponse.json({
      booking: {
        ...booking,
        travellers: travellerRows,
      },
    });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number((await params).id);
    const body = (await request.json()) as BookingInput & { version: number };

    if (!body.reference || !body.productId || !body.serviceDate) {
      return NextResponse.json({ error: "reference, productId, serviceDate required" }, { status: 400 });
    }

    const ok = await db.transaction(async (tx) => {
      // 1. Optimistic locking check + update
      const updated = await tx
        .update(bookings)
        .set({
          reference: body.reference,
          source: body.source || "Viator",
          productId: body.productId,
          productOptionId: body.productOptionId ?? null,
          serviceDate: body.serviceDate,
          startTime: body.startTime,
          meetingPoint: body.meetingPoint || "",
          phone: body.phone || "",
          language: body.language || "English",
          currency: body.currency || "EUR",
          amountCents: body.amountCents || 0,
          status: body.status || "Pending",
          receivedDate: body.receivedDate || null,
          notes: body.notes || "",
          updatedBy: session.id,
          version: sql`${bookings.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, id), eq(bookings.version, body.version || 1)))
        .returning({ id: bookings.id });

      if (updated.length === 0) {
        return false;
      }

      // 2. Diff-based travellers upsert (avoids wiping out groupId/group assignments)
      const existingTravellers = await tx
        .select({ id: travellers.id })
        .from(travellers)
        .where(eq(travellers.bookingId, id));
      const existingIds = existingTravellers.map((t) => t.id);

      const incomingTravellers = body.travellers || [];
      const incomingIds = incomingTravellers
        .map((t) => t.id)
        .filter((tid): tid is number => typeof tid === "number");

      // Delete travellers not in incoming list
      const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
      if (toDelete.length > 0) {
        await tx
          .delete(travellers)
          .where(and(eq(travellers.bookingId, id), inArray(travellers.id, toDelete)));
      }

      // Upsert travellers
      for (let i = 0; i < incomingTravellers.length; i++) {
        const t = incomingTravellers[i];
        if (t.id && existingIds.includes(t.id)) {
          // Update existing
          await tx
            .update(travellers)
            .set({
              firstName: t.firstName,
              lastName: t.lastName,
              type: t.type,
              isLead: t.isLead,
              dateOfBirth: t.dateOfBirth || null,
              nationality: t.nationality || "",
              grossCents: t.grossCents || 0,
              costCents: t.costCents || 0,
              sortOrder: i,
            })
            .where(eq(travellers.id, t.id));
        } else {
          // Insert new
          await tx.insert(travellers).values({
            bookingId: id,
            firstName: t.firstName,
            lastName: t.lastName,
            type: t.type,
            isLead: t.isLead,
            dateOfBirth: t.dateOfBirth || null,
            nationality: t.nationality || "",
            grossCents: t.grossCents || 0,
            costCents: t.costCents || 0,
            sortOrder: i,
            groupId: null, // Initially unassigned
          });
        }
      }

      return true;
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Concurrency conflict: booking was updated by another user. Please reload." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Patch booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number((await params).id);
    await db.update(bookings).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(bookings.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
