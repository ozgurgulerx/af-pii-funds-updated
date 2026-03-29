import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "af-pii-funds-updated-frontend",
    timestamp: new Date().toISOString(),
  });
}
