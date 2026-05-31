import { NextRequest } from "next/server";
import { handleCrmRequest } from "@/lib/crm-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCrmRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCrmRequest(request);
}
