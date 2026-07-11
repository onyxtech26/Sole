import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, productOptions, guides, tourGroups, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { todayRome } from "@/lib/types";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import type { BoardData, GroupCard, TravellerCard } from "@/lib/schedule/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = new URL(request.url).searchParams.get("date") || todayRome();

    // Query A — groups with effective capacity
    const groupRows = await db
      .select({
        id: tourGroups.id,
        sortOrder: tourGroups.sortOrder,
        productId: tourGroups.productId,
        productName: products.shortName,
        optionId: productOptions.id,
        optionCode: productOptions.code,
        optionName: productOptions.name,
        departureTime: tourGroups.departureTime,
        ticketTime: tourGroups.ticketTime,
        ticketStatus: tourGroups.ticketStatus,
        guideId: guides.id,
        guideName: guides.name,
        capacity: sql<number>`COALESCE(${tourGroups.capacity}, ${productOptions.capacity}, 7)`,
      })
      .from(tourGroups)
      .innerJoin(products, eq(tourGroups.productId, products.id))
      .leftJoin(productOptions, eq(tourGroups.productOptionId, productOptions.id))
      .leftJoin(guides, eq(tourGroups.guideId, guides.id))
      .where(eq(tourGroups.serviceDate, date))
      .orderBy(asc(tourGroups.sortOrder)) as any[];

    // Query B — all travellers for the date, assigned or not
    const travRows = await db
      .select({
        id: travellers.id,
        groupId: travellers.groupId,
        sortOrder: travellers.sortOrder,
        firstName: travellers.firstName,
        lastName: travellers.lastName,
        type: travellers.type,
        bookingId: bookings.id,
        bookingRef: bookings.reference,
        bookedTime: bookings.startTime,
        phone: bookings.phone,
        language: bookings.language,
      })
      .from(travellers)
      .innerJoin(bookings, eq(travellers.bookingId, bookings.id))
      .where(and(eq(bookings.serviceDate, date), isNull(bookings.archivedAt)))
      .orderBy(asc(travellers.sortOrder)) as any[];

    // party sizes + per-group counts
    const partySize = new Map<number, number>();
    for (const t of travRows) partySize.set(t.bookingId, (partySize.get(t.bookingId) || 0) + 1);
    const groupCountForBooking = new Map<string, number>(); // `${bookingId}:${groupId}`
    for (const t of travRows) {
      const k = `${t.bookingId}:${t.groupId ?? "u"}`;
      groupCountForBooking.set(k, (groupCountForBooking.get(k) || 0) + 1);
    }

    const toCard = (t: (typeof travRows)[number]): TravellerCard => ({
      id: t.id,
      groupId: t.groupId,
      sortOrder: t.sortOrder,
      firstName: t.firstName,
      lastName: t.lastName,
      type: t.type as TravellerCard["type"],
      bookingId: t.bookingId,
      bookingRef: t.bookingRef,
      bookedTime: (t.bookedTime || "").slice(0, 5),
      partySize: partySize.get(t.bookingId) || 1,
      countInThisGroup: groupCountForBooking.get(`${t.bookingId}:${t.groupId ?? "u"}`) || 1,
      phone: t.phone,
      language: t.language,
    });

    const groups: GroupCard[] = groupRows.map((g) => ({
      id: g.id,
      sortOrder: g.sortOrder,
      productId: g.productId,
      productName: g.productName,
      optionId: g.optionId,
      optionCode: g.optionCode,
      departureTime: g.departureTime ? g.departureTime.slice(0, 5) : null,
      ticketTime: g.ticketTime ? g.ticketTime.slice(0, 5) : null,
      ticketStatus: g.ticketStatus,
      guideId: g.guideId,
      guideName: g.guideName,
      capacity: Number(g.capacity),
      travellers: travRows.filter((t) => t.groupId === g.id).map(toCard),
    }));

    const unassigned = travRows.filter((t) => t.groupId === null).map(toCard);

    const [guideList, productList, optionList] = await Promise.all([
      db.select({ id: guides.id, name: guides.name }).from(guides).where(eq(guides.active, true)).orderBy(asc(guides.name)),
      db.select({ id: products.id, shortName: products.shortName }).from(products).where(eq(products.active, true)).orderBy(asc(products.sortOrder)),
      db.select({ id: productOptions.id, productId: productOptions.productId, code: productOptions.code, name: productOptions.name, capacity: productOptions.capacity }).from(productOptions).where(eq(productOptions.active, true)).orderBy(asc(productOptions.sortOrder)),
    ]);

    const board: BoardData = {
      serviceDate: date,
      groups,
      unassigned,
      guides: guideList,
      products: productList,
      options: optionList,
    };
    return NextResponse.json(board);
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
