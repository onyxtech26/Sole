import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { todayRome } from "@/lib/types";
import { and, eq, isNull, desc, gte, lt, sql } from "drizzle-orm";
import type { BookingInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tab = new URL(request.url).searchParams.get("tab") || "today";
    const today = todayRome();

    const conds = [isNull(bookings.archivedAt)];
    if (tab === "today") conds.push(eq(bookings.serviceDate, today));
    else if (tab === "upcoming") conds.push(gte(bookings.serviceDate, today));
    else if (tab === "past") conds.push(lt(bookings.serviceDate, today));
    else if (tab === "cancelled") conds.push(eq(bookings.status, "Cancelled"));

    const rows = await db
      .select({
        id: bookings.id, reference: bookings.reference, serviceDate: bookings.serviceDate,
        startTime: bookings.startTime, productName: products.shortName, phone: bookings.phone,
        language: bookings.language, status: bookings.status, amountCents: bookings.amountCents,
        pax: sql<number>`(SELECT count(*) FROM travellers t WHERE t.booking_id = ${bookings.id})`,
      })
      .from(bookings)
      .innerJoin(products, eq(bookings.productId, products.id))
      .where(and(...conds))
      .orderBy(desc(bookings.serviceDate), bookings.startTime);

    return NextResponse.json({ bookings: rows });
  } catch (error) {
    console.error("Bookings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as BookingInput;

    if (!body.reference || !body.productId || !body.serviceDate) {
      return NextResponse.json({ error: "reference, productId, serviceDate required" }, { status: 400 });
    }

    const id = await db.transaction(async (tx: any) => {
      const [b] = await tx
        .insert(bookings)
        .values({
          reference: body.reference, source: body.source || "Viator", productId: body.productId,
          productOptionId: body.productOptionId ?? null, serviceDate: body.serviceDate, startTime: body.startTime,
          meetingPoint: body.meetingPoint || "", phone: body.phone || "", language: body.language || "English",
          currency: body.currency || "EUR", amountCents: body.amountCents || 0, status: body.status || "Pending",
          receivedDate: body.receivedDate || null, notes: body.notes || "",
          createdBy: session.id, updatedBy: session.id,
        })
        .returning({ id: bookings.id });

      if (body.travellers?.length) {
        await tx.insert(travellers).values(
          body.travellers.map((t, i) => ({
            bookingId: b.id, firstName: t.firstName, lastName: t.lastName, type: t.type,
            isLead: t.isLead, dateOfBirth: t.dateOfBirth || null, nationality: t.nationality || "",
            grossCents: t.grossCents || 0, costCents: t.costCents || 0, sortOrder: i,
          })),
        );
      }
      return b.id;
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Bookings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
