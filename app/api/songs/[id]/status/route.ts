import { NextRequest, NextResponse } from "next/server";
import { getSongStatus } from "@/lib/services/songService";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/songs/[id]/status">
) {
  const { id } = await ctx.params;
  const status = await getSongStatus(id);

  if (!status) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}
