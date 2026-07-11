import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productOptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prods = await db.select().from(products).orderBy(asc(products.sortOrder));
    const opts = await db.select().from(productOptions).orderBy(asc(productOptions.sortOrder));
    const withOptions = prods.map((p) => ({
      ...p,
      options: opts.filter((o) => o.productId === p.id),
    }));
    return NextResponse.json({ products: withOptions });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
