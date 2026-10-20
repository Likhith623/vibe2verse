import { z } from "zod";

export const RapStyleEnum = z.enum([
  "funny_comedy",
  "friendly_roast",
  "desi_hiphop",
  "trap",
  "old_school",
  "chill",
  "energetic_party",
]);

export const MoodEnum = z.enum([
  "funny",
  "confident",
  "energetic",
  "chill",
  "dramatic",
  "affectionate",
  "motivational",
  "celebratory",
]);

export const RoastLevelEnum = z.enum(["clean", "mild", "spicy"]);

export const LanguageEnum = z.enum([
  "english",
  "hindi",
  "hinglish",
  "punjabi",
  "tamil",
  "telugu",
]);

// ── Create song request ────────────────────────────────────────
export const CreateSongSchema = z.object({
  personality_input: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be under 1000 characters")
    .refine(
      (val) =>
        !/(hate|kill|abuse|threaten|racist|sexist)/i.test(val),
      "Content contains disallowed language"
    ),
  character_name: z.string().max(50).optional(),
  language: LanguageEnum.default("english"),
  rap_style: RapStyleEnum.default("funny_comedy"),
  mood: MoodEnum.default("funny"),
  roast_level: RoastLevelEnum.default("mild"),
  requested_duration_seconds: z.number().int().min(30).max(180).default(60),
  funny_habits: z.string().max(300).optional(),
  memorable_incidents: z.string().max(500).optional(),
  relationship: z.string().max(100).optional(),
});

export type CreateSongInput = z.infer<typeof CreateSongSchema>;

// ── Lyrics structure ───────────────────────────────────────────
export const LyricsSectionSchema = z.object({
  type: z.enum(["intro", "verse", "chorus", "bridge", "outro"]),
  label: z.string(),
  lines: z.array(z.string()),
});

export const StructuredLyricsSchema = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(LyricsSectionSchema),
  language: z.string(),
  style: z.string(),
  mood: z.string(),
  energy: z.enum(["low", "medium", "high"]),
  estimated_duration_seconds: z.number(),
  prompt_for_music_provider: z.string(),
});

export type StructuredLyrics = z.infer<typeof StructuredLyricsSchema>;
export type LyricsSection = z.infer<typeof LyricsSectionSchema>;

// ── API response shapes ────────────────────────────────────────
export const SongStatusResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  progress: z.number(),
  title: z.string().nullable(),
  audio_path: z.string().nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  completed_at: z.string().nullable(),
});

export type SongStatusResponse = z.infer<typeof SongStatusResponseSchema>;
