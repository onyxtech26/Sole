import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tourGroups, productOptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await request.json();
    if (!b.serviceDate || !b.productId) {
      return NextResponse.json({ error: "serviceDate and productId required" }, { status: 400 });
    }
    // next sortOrder for the day
    const [{ maxSort }] = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(${tourGroups.sortOrder}), 0)` })
      .from(tourGroups)
      .where(eq(tourGroups.serviceDate, b.serviceDate));

    const [row] = await db
      .insert(tourGroups)
      .values({
        serviceDate: b.serviceDate,
        productId: b.productId,
        productOptionId: b.productOptionId ?? null,
        guideId: b.guideId ?? null,
        departureTime: b.departureTime ?? null,
        ticketTime: b.ticketTime ?? null,
        ticketStatus: b.ticketStatus ?? "",
        sortOrder: Number(maxSort) + 10,
      })
      .returning({ id: tourGroups.id });

    return NextResponse.json({ id: row.id });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
