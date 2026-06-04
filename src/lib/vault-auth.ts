import { NextResponse } from "next/server";

/** Returns a 403 response if role is not ceo. Otherwise null (pass). */
export function requireCeo(currentRole: string): NextResponse | null {
  if (currentRole !== "ceo")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
