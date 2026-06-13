import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth, isAuthResponse } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (isAuthResponse(auth)) return auth;
  try {
    const searchParams = new URL(request.url).searchParams;
    const daysParam = searchParams.get("days") || "7";
    const days = parseInt(daysParam);

    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const allContacts = await db.select().from(contacts);
    const coldCount = allContacts.filter(c => c.temperature === "cold").length;
    const warmCount = allContacts.filter(c => c.temperature === "warm").length;
    const hotCount = allContacts.filter(c => c.temperature === "hot").length;
    const deadCount = allContacts.filter(c => c.temperature === "dead").length;

    const prospectionActivities = (await db
      .select()
      .from(activities)
      .where(and(gte(activities.createdAt, pastDate))))
      .filter(a =>
        a.description.toLowerCase().includes("prospección") ||
        a.description.toLowerCase().includes("whatsapp") ||
        a.description.toLowerCase().includes("mensaje")
      );

    const messagesRemained = prospectionActivities.filter(a =>
      a.description.includes("enviado") || a.description.includes("sent")
    ).length;

    const responsesReceived = prospectionActivities.filter(a =>
      a.description.includes("respondió") ||
      a.description.includes("respuesta") ||
      a.description.includes("positiva")
    ).length;

    const warmContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.temperature, "warm"));

    const recentWarmConversions = warmContacts.filter(c =>
      c.updatedAt && c.updatedAt >= pastDate
    ).length;

    const responseRate =
      messagesRemained > 0
        ? ((responsesReceived / messagesRemained) * 100).toFixed(1)
        : 0;

    const conversionRate =
      messagesRemained > 0
        ? ((recentWarmConversions / messagesRemained) * 100).toFixed(1)
        : 0;

    const avgScore =
      allContacts.length > 0
        ? (allContacts.reduce((sum, c) => sum + c.score, 0) / allContacts.length).toFixed(1)
        : 0;

    return NextResponse.json({
      period: `últimos ${days} días`,
      timestamp: new Date().toISOString(),
      distribution: { cold: coldCount, warm: warmCount, hot: hotCount, dead: deadCount, total: allContacts.length },
      prospection: {
        messagesSent: messagesRemained,
        responsesReceived: responsesReceived,
        responseRate: `${responseRate}%`,
        newWarmLeads: recentWarmConversions,
        conversionRate: `${conversionRate}%`,
      },
      metrics: {
        avgScore: parseFloat(avgScore as string),
        coldLeadsCount: coldCount,
        hotLeadsCount: hotCount,
        pipelineHealth: coldCount + warmCount > 0
          ? ((hotCount / (coldCount + warmCount)) * 100).toFixed(1)
          : 0,
      },
      insights: generateInsights({
        coldCount, warmCount, hotCount,
        responseRate: parseFloat(responseRate as string),
        conversionRate: parseFloat(conversionRate as string),
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Error calculando stats: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

function generateInsights(stats: {
  coldCount: number; warmCount: number; hotCount: number;
  responseRate: number; conversionRate: number;
}): string[] {
  const insights: string[] = [];

  if (stats.responseRate === 0) {
    insights.push("Sin respuestas aún. Espera más tiempo o ajusta el mensaje.");
  } else if (stats.responseRate < 20) {
    insights.push(`Tasa de respuesta baja (${stats.responseRate.toFixed(1)}%). Considera personalizar mensajes.`);
  } else if (stats.responseRate > 40) {
    insights.push(`Excelente tasa de respuesta (${stats.responseRate.toFixed(1)}%). El mensaje está resonando.`);
  }

  if (stats.conversionRate > 0 && stats.conversionRate < 10) {
    insights.push("Baja conversión. Mejora follow-up o personalización en warm leads.");
  } else if (stats.conversionRate >= 20) {
    insights.push(`Conversión sólida (${stats.conversionRate.toFixed(1)}%). El sistema está funcionando.`);
  }

  if (stats.coldCount > stats.warmCount * 3) {
    insights.push(`Muchos leads fríos (${stats.coldCount}). Pipeline necesita calentar.`);
  }

  if (stats.hotCount === 0 && stats.warmCount > 5) {
    insights.push("Warm leads sin cerrar. Prioritiza follow-up en warm leads.");
  }

  if (insights.length === 0) {
    insights.push("Pipeline saludable. Continúa con la prospección automática.");
  }

  return insights;
}
