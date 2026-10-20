import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      gemini: !!process.env.GEMINI_API_KEY ? "configured" : "not_configured",
      replicate: !!process.env.REPLICATE_API_TOKEN ? "configured" : "not_configured",
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured",
    },
  });
}
