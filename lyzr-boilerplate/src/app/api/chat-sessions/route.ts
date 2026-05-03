import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, user.id))
    .orderBy(desc(chatSessions.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const body = await req.json();
    const { id, title, messages, artifacts } = body;
    if (typeof id !== "string" || typeof title !== "string") {
      return NextResponse.json({ error: "id and title required" }, { status: 400 });
    }

    // upsert: only allow if owned by user (or new)
    const existing = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(chatSessions)
        .set({ title, messages: messages ?? [], artifacts: artifacts ?? null, updatedAt: new Date() })
        .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(chatSessions)
      .values({
        id,
        userId: user.id,
        title,
        messages: messages ?? [],
        artifacts: artifacts ?? null,
      })
      .returning();
    return NextResponse.json(created);
  } catch (e) {
    console.error("[chat-sessions POST]", e);
    return NextResponse.json({ error: "Failed to save chat session" }, { status: 500 });
  }
}
