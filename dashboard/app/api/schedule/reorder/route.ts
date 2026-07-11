import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { travellers, tourGroups, productOptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq, inArray, sql } from "drizzle-orm";

type Container = { groupId: number | null; travellerIds: number[] };

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      containers: Container[];
      groupOrder?: number[];
    };

    await db.transaction(async (tx: any) => {
      for (const c of body.containers) {
        for (let i = 0; i < c.travellerIds.length; i++) {
          await tx
            .update(travellers)
            .set({ groupId: c.groupId, sortOrder: i * 10 })
            .where(eq(travellers.id, c.travellerIds[i]));
        }
      }
      if (body.groupOrder && body.groupOrder.length) {
        for (let i = 0; i < body.groupOrder.length; i++) {
          await tx.update(tourGroups).set({ sortOrder: i * 10 }).where(eq(tourGroups.id, body.groupOrder[i]));
        }
      }
    });

    // capacity warnings — never a block (REQ-21 workflow)
    const warnings: { groupId: number; count: number; capacity: number }[] = [];
    const affected = body.containers.map((c) => c.groupId).filter((g): g is number => g !== null);
    if (affected.length) {
      const rows = await db
        .select({
          id: tourGroups.id,
          capacity: sql<number>`COALESCE(${tourGroups.capacity}, ${productOptions.capacity}, 7)`,
          count: sql<number>`(SELECT count(*) FROM travellers t WHERE t.group_id = ${tourGroups.id})`,
        })
        .from(tourGroups)
        .leftJoin(productOptions, eq(tourGroups.productOptionId, productOptions.id))
        .where(inArray(tourGroups.id, affected));
      for (const r of rows) {
        if (Number(r.count) > Number(r.capacity)) {
          warnings.push({ groupId: r.id, count: Number(r.count), capacity: Number(r.capacity) });
        }
      }
    }
    return NextResponse.json({ warnings });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
