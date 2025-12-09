import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    if (!db) {
      console.error("Database not available - DATABASE_URL not set");
      return NextResponse.json([], { status: 200 });
    }

    const allTemplates = await db
      .select()
      .from(templates)
      .orderBy(desc(templates.createdAt));

    return NextResponse.json(allTemplates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      console.error("Database not available - DATABASE_URL not set");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, description, useCase, architecture, credits, roi, chatHistory } = body;

    if (!name || !useCase || !architecture || !credits || !roi) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [newTemplate] = await db
      .insert(templates)
      .values({
        name,
        description: description || null,
        useCase,
        architecture,
        credits,
        roi,
        chatHistory: chatHistory || [],
      })
      .returning();

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
