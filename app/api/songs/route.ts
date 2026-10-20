import { NextRequest, NextResponse } from "next/server";
import { CreateSongSchema } from "@/lib/validation/schemas";
import {
  createSongAndStartGeneration,
  listSongs,
} from "@/lib/services/songService";

// Rate limit: basic in-memory map (upgrade to Redis for production)
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  const maxPerHour = parseInt(process.env.RATE_LIMIT_PER_HOUR ?? "10");

  if (!limit || limit.reset < now) {
    rateLimitMap.set(ip, { count: 1, reset: now + 3600_000 });
    return true;
  }

  if (limit.count >= maxPerHour) return false;
  limit.count++;
  return true;
}

// GET /api/songs — list songs
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const songs = await listSongs(userId);
  return NextResponse.json({ songs });
}

// POST /api/songs — create a new song generation request
export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating another song." },
      { status: 429 }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateSongSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Extract user_id from auth header (MVP: optional)
  // In production, validate JWT via Supabase Auth
  const userId: string | null = null; // TODO: extract from session

  try {
    const song = await createSongAndStartGeneration(parsed.data, userId);
    return NextResponse.json(
      {
        id: song.id,
        status: song.status,
        progress: song.progress,
        message: "Song generation started",
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/songs]", message);
    return NextResponse.json(
      { error: "Failed to start song generation" },
      { status: 500 }
    );
  }
}
