import { NextRequest, NextResponse } from "next/server";
import { getSongById, deleteSong } from "@/lib/services/songService";

// GET /api/songs/[id]
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/songs/[id]">
) {
  const { id } = await ctx.params;
  const song = await getSongById(id);

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  return NextResponse.json(song);
}

// DELETE /api/songs/[id]
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/songs/[id]">
) {
  const { id } = await ctx.params;
  const deleted = await deleteSong(id);

  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete song" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
