// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SongStatus =
  | "pending"
  | "generating_lyrics"
  | "generating_music"
  | "processing_audio"
  | "completed"
  | "failed"
  | "cancelled";

export type RapStyle =
  | "funny_comedy"
  | "friendly_roast"
  | "desi_hiphop"
  | "trap"
  | "old_school"
  | "chill"
  | "energetic_party";

export type Mood =
  | "funny"
  | "confident"
  | "energetic"
  | "chill"
  | "dramatic"
  | "affectionate"
  | "motivational"
  | "celebratory";

export type RoastLevel = "clean" | "mild" | "spicy";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      songs: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          description: string | null;
          personality_input: string;
          character_name: string | null;
          language: string;
          rap_style: RapStyle;
          mood: Mood;
          roast_level: RoastLevel;
          requested_duration_seconds: number;
          status: SongStatus;
          progress: number;
          provider: string | null;
          provider_job_id: string | null;
          audio_path: string | null;
          audio_duration_seconds: number | null;
          cover_image_path: string | null;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          description?: string | null;
          personality_input: string;
          character_name?: string | null;
          language?: string;
          rap_style?: RapStyle;
          mood?: Mood;
          roast_level?: RoastLevel;
          requested_duration_seconds?: number;
          status?: SongStatus;
          progress?: number;
          provider?: string | null;
          provider_job_id?: string | null;
          audio_path?: string | null;
          audio_duration_seconds?: number | null;
          cover_image_path?: string | null;
          error_code?: string | null;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["songs"]["Insert"]>;
      };
      song_lyrics: {
        Row: {
          id: string;
          song_id: string;
          version: number;
          lyrics_json: Json;
          plain_text: string;
          model_provider: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          version?: number;
          lyrics_json: Json;
          plain_text: string;
          model_provider: string;
        };
        Update: never;
      };
      generation_jobs: {
        Row: {
          id: string;
          song_id: string;
          job_type: string;
          status: string;
          attempt_count: number;
          provider_job_id: string | null;
          last_error_code: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          job_type: string;
          status?: string;
          attempt_count?: number;
          provider_job_id?: string | null;
          last_error_code?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["generation_jobs"]["Insert"]>;
      };
      song_events: {
        Row: {
          id: string;
          song_id: string;
          event_type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          event_type: string;
          payload?: Json | null;
        };
        Update: never;
      };
    };
  };
}

// Convenience type aliases
export type Song = Database["public"]["Tables"]["songs"]["Row"];
export type SongInsert = Database["public"]["Tables"]["songs"]["Insert"];
export type SongLyrics = Database["public"]["Tables"]["song_lyrics"]["Row"];
export type GenerationJob =
  Database["public"]["Tables"]["generation_jobs"]["Row"];
