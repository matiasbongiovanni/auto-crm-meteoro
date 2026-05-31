import { NextResponse } from "next/server";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { eq, isNull, asc } from "drizzle-orm";

export async function GET() {
  const pendingFollowups = await db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactId: activities.contactId,
      dealId: activities.dealId,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(isNull(activities.completedAt))
    .orderBy(asc(activities.scheduledAt));

  const now = Date.now();

  const categorized = {
    overdue: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      return f.scheduledAt.getTime() < now;
    }),
    today: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      const ts = f.scheduledAt.getTime();
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      const endOfDay = new Date().setHours(23, 59, 59, 999);
      return ts >= startOfDay && ts <= endOfDay;
    }),
    upcoming: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      const endOfDay = new Date().setHours(23, 59, 59, 999);
      return f.scheduledAt.getTime() > endOfDay;
    }),
    unscheduled: pendingFollowups.filter((f) => !f.scheduledAt),
  };

  return NextResponse.json(categorized);
}
