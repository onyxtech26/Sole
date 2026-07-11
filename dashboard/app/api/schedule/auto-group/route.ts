import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, productOptions, tourGroups, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { autoGroup, TravellerForAutoGroup, GroupForAutoGroup } from "@/lib/schedule/auto-group";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = new URL(request.url).searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
    }

    // 1. Fetch unassigned travellers
    const unassignedRows = await db
      .select({
        id: travellers.id,
        bookingId: travellers.bookingId,
        productId: bookings.productId,
        productOptionId: bookings.productOptionId,
        language: bookings.language,
        bookedTime: bookings.startTime,
      })
      .from(travellers)
      .innerJoin(bookings, eq(travellers.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.serviceDate, date),
          isNull(bookings.archivedAt),
          isNull(travellers.groupId)
        )
      );

    if (unassignedRows.length === 0) {
      return NextResponse.json({ ok: true, message: "No unassigned travellers to group." });
    }

    const unassigned: TravellerForAutoGroup[] = (unassignedRows as any[]).map((t) => ({
      id: t.id,
      bookingId: t.bookingId,
      productId: t.productId,
      productOptionId: t.productOptionId,
      language: t.language,
      bookedTime: (t.bookedTime || "").slice(0, 5),
    }));

    // 2. Fetch existing groups
    const groupRows = await db
      .select({
        id: tourGroups.id,
        productId: tourGroups.productId,
        productOptionId: tourGroups.productOptionId,
        capacity: sql<number>`COALESCE(${tourGroups.capacity}, ${productOptions.capacity}, 7)`,
      })
      .from(tourGroups)
      .leftJoin(productOptions, eq(tourGroups.productOptionId, productOptions.id))
      .where(eq(tourGroups.serviceDate, date));

    let existingGroups: GroupForAutoGroup[] = [];
    if (groupRows.length > 0) {
      const groupIds = (groupRows as any[]).map((g) => g.id);
      const travRows = await db
        .select({
          id: travellers.id,
          groupId: travellers.groupId,
          bookingId: travellers.bookingId,
          productId: bookings.productId,
          productOptionId: bookings.productOptionId,
          language: bookings.language,
          bookedTime: bookings.startTime,
        })
        .from(travellers)
        .innerJoin(bookings, eq(travellers.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.serviceDate, date),
            isNull(bookings.archivedAt),
            inArray(travellers.groupId, groupIds)
          )
        );

      existingGroups = (groupRows as any[]).map((g) => ({
        id: g.id,
        productId: g.productId,
        productOptionId: g.productOptionId,
        language: "", // derived from travellers in autoGroup
        capacity: Number(g.capacity),
        travellers: (travRows as any[])
          .filter((t) => t.groupId === g.id)
          .map((t) => ({
            id: t.id,
            bookingId: t.bookingId,
            productId: t.productId,
            productOptionId: t.productOptionId,
            language: t.language,
            bookedTime: (t.bookedTime || "").slice(0, 5),
          })),
      }));
    }

    // 3. Fetch active product options
    const optionsList = await db
      .select({ id: productOptions.id, capacity: productOptions.capacity })
      .from(productOptions)
      .where(eq(productOptions.active, true));

    // 4. Run the auto-grouping algorithm
    const result = autoGroup(unassigned, existingGroups, optionsList);

    // 5. Persist results in a transaction
    await db.transaction(async (tx: any) => {
      // Find the maximum sortOrder among existing groups to append new groups
      const [maxGroup] = await tx
        .select({ val: sql<number>`MAX(${tourGroups.sortOrder})` })
        .from(tourGroups)
        .where(eq(tourGroups.serviceDate, date));
      let nextSortOrder = (maxGroup?.val || 0) + 10;

      // Create new groups and assign their travellers
      for (const ng of result.newGroups) {
        const [insertedGroup] = await tx
          .insert(tourGroups)
          .values({
            serviceDate: date,
            productId: ng.productId,
            productOptionId: ng.productOptionId,
            departureTime: ng.departureTime + ":00",
            ticketTime: ng.departureTime + ":00",
            capacity: ng.capacity,
            sortOrder: nextSortOrder,
          })
          .returning({ id: tourGroups.id });
        nextSortOrder += 10;

        for (let i = 0; i < ng.travellers.length; i++) {
          const t = ng.travellers[i];
          await tx
            .update(travellers)
            .set({
              groupId: insertedGroup.id,
              sortOrder: i,
            })
            .where(eq(travellers.id, t.id));
        }
      }

      // Assign travellers to existing groups
      for (const ea of result.existingAssignments) {
        const [maxTrav] = await tx
          .select({ val: sql<number>`MAX(${travellers.sortOrder})` })
          .from(travellers)
          .where(eq(travellers.groupId, ea.groupId));
        const nextTravSortOrder = (maxTrav?.val || 0) + 1;

        await tx
          .update(travellers)
          .set({
            groupId: ea.groupId,
            sortOrder: nextTravSortOrder,
          })
          .where(eq(travellers.id, ea.travellerId));
      }
    });

    return NextResponse.json({ ok: true, newGroupsCount: result.newGroups.length });
  } catch (error) {
    console.error("Auto-group API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
