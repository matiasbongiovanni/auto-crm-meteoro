import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { classifyLead, isAIEnabled } from "@/lib/claude";
import { requireAuth, isAuthResponse } from "@/lib/auth-helpers";
import { calculateLeadScore, suggestTemperature } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (isAuthResponse(auth)) return auth;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json(
      { error: "contactId es requerido" },
      { status: 400 }
    );
  }

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId));

  if (!contact) {
    return NextResponse.json(
      { error: "Contacto no encontrado" },
      { status: 404 }
    );
  }

  const contactActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.contactId, contactId));

  if (isAIEnabled()) {
    try {
      const result = await classifyLead(
        {
          name: contact.name,
          company: contact.company || undefined,
          source: contact.source,
          notes: contact.notes || undefined,
        },
        contactActivities.map((a) => ({
          type: a.type as "call" | "email" | "meeting" | "note" | "follow_up",
          description: a.description,
          date: a.createdAt ? new Date(a.createdAt).toISOString() : "unknown",
        }))
      );

      await db
        .update(contacts)
        .set({
          temperature: result.temperature,
          score: result.score,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));

      return NextResponse.json({ ...result, mode: "ai" });
    } catch {
      // AI failed — fall through to rule-based scoring below
    }
  }

  const lastActivity = contactActivities.sort((a, b) => {
    const aTime = a.createdAt?.getTime() || 0;
    const bTime = b.createdAt?.getTime() || 0;
    return bTime - aTime;
  })[0];

  const daysSinceLastActivity = lastActivity
    ? Math.floor(
        (Date.now() - (lastActivity.createdAt?.getTime() || Date.now())) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  const score = calculateLeadScore({
    temperature: contact.temperature as "cold" | "warm" | "hot",
    hasEmail: !!contact.email,
    hasPhone: !!contact.phone,
    hasCompany: !!contact.company,
    activityCount: contactActivities.length,
    daysSinceLastActivity,
    hasDeals: false,
    dealValue: 0,
  });

  const temperature = suggestTemperature(score);

  await db
    .update(contacts)
    .set({ temperature, score, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));

  return NextResponse.json({
    temperature,
    score,
    nextAction: "Revisar manualmente y dar seguimiento",
    reasoning: "Clasificacion basada en reglas (sin API key)",
    mode: "rules",
  });
}
