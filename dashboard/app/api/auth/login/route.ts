import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    if (!admin || !compareSync(password, admin.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await createSession({ id: admin.id, email: admin.email, name: admin.name });
    return NextResponse.json({ user: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
