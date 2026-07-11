import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tourGroups, travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number((await params).id);
    const b = await request.json();

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["guideId", "departureTime", "ticketTime", "capacity", "ticketStatus", "notes"]) {
      if (k in b) patch[k] = b[k];
    }
    await db.update(tourGroups).set(patch).where(eq(tourGroups.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number((await params).id);
    // Return travellers to Unassigned, then delete the group (never delete a person)
    await db.transaction(async (tx) => {
      await tx.update(travellers).set({ groupId: null }).where(eq(travellers.groupId, id));
      await tx.delete(tourGroups).where(eq(tourGroups.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
