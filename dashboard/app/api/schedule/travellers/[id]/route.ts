import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { travellers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/schedule/travellers/[id]
 * Assigns (or unassigns) a single traveller to a group.
 * Body: { groupId: number | null, sortOrder?: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = Number((await params).id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid traveller id" }, { status: 400 });
    }

    const body = (await request.json()) as { groupId?: number | null; sortOrder?: number };

    const patch: Record<string, unknown> = {};
    if ("groupId" in body) patch.groupId = body.groupId ?? null;
    if ("sortOrder" in body) patch.sortOrder = body.sortOrder;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db.update(travellers).set(patch).where(eq(travellers.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Traveller PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
