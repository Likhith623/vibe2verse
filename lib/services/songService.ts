import "server-only";
import { db } from "../supabase/server";
import { generateLyrics, lyricsToPlainText } from "../ai/lyrics";
import { getMusicProvider } from "../ai/music";
import type { CreateSongInput, StructuredLyrics } from "../validation/schemas";
import type { Song, SongLyrics } from "../supabase/types";
import { randomUUID } from "crypto";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!url && !url.includes("placeholder") && !!key;
}

// ── In-Memory Repository Fallback (when Supabase credentials are not configured) ──
interface MemorySongRecord {
  song: Song;
  lyrics?: StructuredLyrics;
  jobs: Array<{ id: string; type: string; status: string }>;
  events: Array<{ type: string; payload?: object }>;
}

const memoryStore = new Map<string, MemorySongRecord>();

// ── Create Song & Kickoff Generation ─────────────────────────────
export async function createSongAndStartGeneration(
  input: CreateSongInput,
  userId: string | null
): Promise<Song> {
  const songId = randomUUID();
  const now = new Date().toISOString();

  const songData: Song = {
    id: songId,
    user_id: userId,
    title: input.character_name ? `${input.character_name}'s Rap` : "Vibe2Verse Cypher",
    description: null,
    personality_input: input.personality_input,
    character_name: input.character_name ?? null,
    language: input.language,
    rap_style: input.rap_style,
    mood: input.mood,
    roast_level: input.roast_level,
    requested_duration_seconds: input.requested_duration_seconds,
    status: "pending",
    progress: 5,
    provider: null,
    provider_job_id: null,
    audio_path: null,
    audio_duration_seconds: input.requested_duration_seconds,
    cover_image_path: null,
    error_code: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data: song, error } = await db
        .from("songs")
        .insert({
          id: songId,
          user_id: userId,
          personality_input: input.personality_input,
          character_name: input.character_name ?? null,
          language: input.language,
          rap_style: input.rap_style,
          mood: input.mood,
          roast_level: input.roast_level,
          requested_duration_seconds: input.requested_duration_seconds,
          status: "pending",
          progress: 5,
        })
        .select()
        .single();

      if (error || !song) {
        throw new Error(`Failed to create song in DB: ${error?.message}`);
      }

      await db.from("generation_outbox").insert({
        song_id: song.id,
        event_type: "song.generate",
        payload: { input, userId },
      });
    } catch (dbErr) {
      console.warn("[SongService] Supabase insert failed, falling back to in-memory store:", dbErr);
      memoryStore.set(songId, { song: songData, jobs: [], events: [] });
    }
  } else {
    memoryStore.set(songId, { song: songData, jobs: [], events: [] });
  }

  // Non-blocking background worker
  if (process.env.NODE_ENV !== "test") {
    setImmediate(() => {
      runGenerationPipeline(songId, input).catch((err) => {
        console.error(`[SongWorker] Unhandled pipeline error for song ${songId}:`, err);
      });
    });
  }

  return songData;
}

// ── Full Generation Pipeline ─────────────────────────────────────
export async function runGenerationPipeline(
  songId: string,
  input: CreateSongInput
): Promise<void> {
  const isMock = !process.env.REPLICATE_API_TOKEN;
  const pollIntervalMs = isMock ? 1200 : 4000;
  const maxAttempts = isMock ? 10 : 45;

  try {
    // ── Step 1: Generate Lyrics ────────────────────────────
    await updateSongStatus(songId, "generating_lyrics", 15);

    const lyrics = await generateLyrics(input);
    const plainText = lyricsToPlainText(lyrics);

    await saveSongLyrics(songId, lyrics, plainText);
    await updateSongStatus(songId, "generating_music", 40, {
      title: lyrics.title,
      description: lyrics.description,
    });

    // ── Step 2: Request Music Generation ───────────────────
    const provider = getMusicProvider();
    const result = await provider.generateSong(
      lyrics,
      lyrics.prompt_for_music_provider,
      input.requested_duration_seconds
    );

    await updateSongStatus(songId, "generating_music", 55, {
      provider: provider.name,
      provider_job_id: result.provider_job_id,
    });

    // ── Step 3: Poll Provider until Finished ───────────────
    let audioUrl: string | undefined = result.audio_url;

    if (!audioUrl) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await sleep(pollIntervalMs);

        const status = await provider.getGenerationStatus(result.provider_job_id);
        const progress = Math.min(55 + Math.floor((attempt / maxAttempts) * 30), 85);
        await updateSongStatus(songId, "generating_music", progress);

        if (status.status === "completed" && status.audio_url) {
          audioUrl = status.audio_url;
          break;
        }

        if (status.status === "failed") {
          throw new Error(`Music provider error: ${status.error ?? "Failed to produce track"}`);
        }
      }
    }

    if (!audioUrl) {
      throw new Error("Music generation timed out. Please try again.");
    }

    // ── Step 4: Process & Store Audio ─────────────────────
    await updateSongStatus(songId, "processing_audio", 90);
    const storedAudioPath = await downloadAndStoreAudio(songId, audioUrl);

    // ── Step 5: Mark Completed ─────────────────────────────
    const completedAt = new Date().toISOString();
    await updateSongStatus(songId, "completed", 100, {
      audio_path: storedAudioPath,
      completed_at: completedAt,
    });

    await logEvent(songId, "song.completed", { audio_path: storedAudioPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SongWorker] Failed for song ${songId}:`, message);

    await updateSongStatus(songId, "failed", 0, {
      error_code: "GENERATION_FAILED",
      error_message: message.slice(0, 500),
    });

    await logEvent(songId, "song.failed", { error: message });
  }
}

// ── Store Audio Helper ───────────────────────────────────────────
async function downloadAndStoreAudio(
  songId: string,
  audioUrl: string
): Promise<string> {
  // If it's a local public asset or data URL, return directly
  if (audioUrl.startsWith("/") || audioUrl.startsWith("data:")) {
    return audioUrl;
  }

  if (!isSupabaseConfigured()) {
    return audioUrl;
  }

  try {
    const res = await fetch(audioUrl);
    if (!res.ok) return audioUrl;

    const buffer = await res.arrayBuffer();
    const filename = `public/${songId}/song.mp3`;

    const { error } = await db.storage
      .from("audio")
      .upload(filename, buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (error) {
      console.warn("[SongService] Storage upload failed, keeping direct audio URL:", error.message);
      return audioUrl;
    }

    return filename;
  } catch (err) {
    console.warn("[SongService] Error uploading audio to storage, using direct URL:", err);
    return audioUrl;
  }
}

// ── Signed URL Helper ────────────────────────────────────────────
export async function getAudioSignedUrl(
  audioPath: string | null
): Promise<string | null> {
  if (!audioPath) return null;
  if (audioPath.startsWith("/") || audioPath.startsWith("http://") || audioPath.startsWith("https://") || audioPath.startsWith("data:")) {
    return audioPath;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await db.storage
        .from("audio")
        .createSignedUrl(audioPath, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // fallback
    }
  }

  return audioPath;
}

// ── Save Lyrics Helper ───────────────────────────────────────────
async function saveSongLyrics(
  songId: string,
  lyrics: StructuredLyrics,
  plainText: string
) {
  if (isSupabaseConfigured()) {
    try {
      await db.from("song_lyrics").insert({
        song_id: songId,
        version: 1,
        lyrics_json: lyrics as object,
        plain_text: plainText,
        model_provider: "gemini-1.5-flash",
      });
    } catch (err) {
      console.warn("[SongService] Failed to insert lyrics to DB:", err);
    }
  }

  // Also cache in memory
  const mem = memoryStore.get(songId);
  if (mem) {
    mem.lyrics = lyrics;
  }
}

// ── Status & Song Retrieval ──────────────────────────────────────
export async function getSongStatus(songId: string): Promise<{
  id: string;
  status: string;
  progress: number;
  title: string | null;
  audio_path: string | null;
  audio_url: string | null;
  lyrics?: StructuredLyrics;
  error_code: string | null;
  error_message: string | null;
  completed_at: string | null;
} | null> {
  let song: Song | null = null;
  let lyrics: StructuredLyrics | undefined = undefined;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await db
        .from("songs")
        .select(`id, status, progress, title, audio_path, error_code, error_message, completed_at, song_lyrics(lyrics_json)`)
        .eq("id", songId)
        .single();

      if (!error && data) {
        song = data as unknown as Song;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lyr = (data as any).song_lyrics;
        if (Array.isArray(lyr) && lyr.length > 0) {
          lyrics = lyr[0]?.lyrics_json;
        } else if (lyr?.lyrics_json) {
          lyrics = lyr.lyrics_json;
        }
      }
    } catch (err) {
      console.warn("[SongService] DB getSongStatus failed, checking memory:", err);
    }
  }

  if (!song) {
    const mem = memoryStore.get(songId);
    if (!mem) return null;
    song = mem.song;
    lyrics = mem.lyrics;
  }

  const audio_url = await getAudioSignedUrl(song.audio_path);

  return {
    id: song.id,
    status: song.status,
    progress: song.progress,
    title: song.title,
    audio_path: song.audio_path,
    audio_url,
    lyrics,
    error_code: song.error_code,
    error_message: song.error_message,
    completed_at: song.completed_at,
  };
}

export async function getSongById(songId: string): Promise<Record<string, unknown> | null> {
  let song: Song | null = null;
  let lyrics: StructuredLyrics | undefined = undefined;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await db
        .from("songs")
        .select(`*, song_lyrics(id, version, plain_text, lyrics_json, model_provider, created_at)`)
        .eq("id", songId)
        .single();

      if (!error && data) {
        song = data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lyr = (data as any).song_lyrics;
        if (Array.isArray(lyr) && lyr.length > 0) {
          lyrics = lyr[0]?.lyrics_json;
        }
      }
    } catch (err) {
      console.warn("[SongService] DB getSongById failed, checking memory:", err);
    }
  }

  if (!song) {
    const mem = memoryStore.get(songId);
    if (!mem) return null;
    song = mem.song;
    lyrics = mem.lyrics;
  }

  const audio_url = await getAudioSignedUrl(song.audio_path);
  return { ...song, audio_url, lyrics };
}

export async function listSongs(userId: string | null): Promise<Song[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = db
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn("[SongService] DB listSongs failed, falling back to memory:", err);
    }
  }

  const list = Array.from(memoryStore.values())
    .map((m) => m.song)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return list;
}

export async function deleteSong(songId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { data: song } = await db
        .from("songs")
        .select("id, audio_path")
        .eq("id", songId)
        .single();

      if (song?.audio_path && !song.audio_path.startsWith("/") && !song.audio_path.startsWith("http")) {
        await db.storage.from("audio").remove([song.audio_path]);
      }

      await db.from("songs").delete().eq("id", songId);
    } catch (err) {
      console.warn("[SongService] DB deleteSong failed:", err);
    }
  }

  memoryStore.delete(songId);
  return true;
}

// ── Status Updates & Event Logging ───────────────────────────────
async function updateSongStatus(
  songId: string,
  status: Song["status"],
  progress: number,
  extra?: Partial<Song>
) {
  const now = new Date().toISOString();

  // Update memory store
  const mem = memoryStore.get(songId);
  if (mem) {
    mem.song = {
      ...mem.song,
      status,
      progress,
      updated_at: now,
      ...extra,
    };
  }

  // Update Supabase
  if (isSupabaseConfigured()) {
    try {
      await db
        .from("songs")
        .update({ status, progress, updated_at: now, ...extra })
        .eq("id", songId);
    } catch (err) {
      console.warn("[SongService] DB status update failed:", err);
    }
  }
}

async function logEvent(songId: string, eventType: string, payload?: object) {
  const mem = memoryStore.get(songId);
  if (mem) {
    mem.events.push({ type: eventType, payload });
  }

  if (isSupabaseConfigured()) {
    try {
      await db.from("song_events").insert({
        song_id: songId,
        event_type: eventType,
        payload: (payload ?? null) as Record<string, unknown> | null,
      });
    } catch {
      // ignore
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
