"use client";

import { create } from "zustand";
import type { CreateSongInput } from "@/lib/validation/schemas";
import type { Mood } from "@/lib/supabase/types";

export type CharacterState =
  | "idle"
  | "listening"
  | "thinking"
  | "excited"
  | "performing"
  | "chilling"
  | "error";

export type ReactionType = "dizzy" | "chestbump" | "moonwalk" | "spin" | "scratch";

export type GenerationStatus =
  | "idle"
  | "submitting"
  | "generating_lyrics"
  | "generating_music"
  | "processing_audio"
  | "completed"
  | "failed";

export type OutfitTheme = "streetwear" | "cyberpunk" | "fire" | "royal";
export type CameraPreset = "stage" | "closeup" | "side" | "orbit";

export interface SongRecord {
  id: string;
  title: string | null;
  status: string;
  progress: number;
  audio_url: string | null;
  audio_path: string | null;
  lyrics?: LyricsData;
  mood: Mood;
  rap_style: string;
  language: string;
  created_at: string;
  personality_input?: string;
  character_name?: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface LyricsData {
  title: string;
  sections: { type: string; label: string; lines: string[] }[];
  plain_text?: string;
}

interface SongStore {
  // Character state
  characterState: CharacterState;
  setCharacterState: (state: CharacterState) => void;
  activeReaction: ReactionType | null;
  triggerReaction: (reaction: ReactionType) => void;

  // Accessories & customization
  accessories: {
    shades: boolean;
    headphones: boolean;
    goldChain: boolean;
    outfit: OutfitTheme;
  };
  toggleShades: () => void;
  toggleHeadphones: () => void;
  toggleGoldChain: () => void;
  cycleOutfit: () => void;

  // Camera preset
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;

  // Voice synthesis rap option
  voiceRapEnabled: boolean;
  toggleVoiceRap: () => void;

  // Current song being generated
  currentSongId: string | null;
  currentSong: SongRecord | null;
  generationStatus: GenerationStatus;
  generationProgress: number;
  generationError: string | null;

  // Audio player
  isPlaying: boolean;
  audioCurrentTime: number;
  audioDuration: number;
  audioVolume: number;
  audioAmplitude: number;
  setIsPlaying: (v: boolean) => void;
  setAudioCurrentTime: (t: number) => void;
  setAudioDuration: (d: number) => void;
  setAudioVolume: (v: number) => void;
  setAudioAmplitude: (amp: number) => void;

  // UI panels
  showPersonalityForm: boolean;
  showLyrics: boolean;
  showHistory: boolean;
  showSettings: boolean;
  openPersonalityForm: () => void;
  closePersonalityForm: () => void;
  togglePersonalityForm: () => void;
  toggleLyrics: () => void;
  toggleHistory: () => void;
  toggleSettings: () => void;

  // Song history
  songHistory: SongRecord[];
  addToHistory: (song: SongRecord) => void;
  loadHistory: () => Promise<void>;

  // Form data
  formData: Partial<CreateSongInput>;
  setFormData: (data: Partial<CreateSongInput>) => void;

  // Actions
  startGeneration: (input: CreateSongInput) => Promise<void>;
  pollSongStatus: (songId: string) => Promise<void>;
  selectSong: (song: SongRecord) => void;
  reset: () => void;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const useSongStore = create<SongStore>((set, get) => ({
  // Character
  characterState: "idle",
  setCharacterState: (state) => set({ characterState: state }),
  activeReaction: null,
  triggerReaction: (reaction) => {
    set({ activeReaction: reaction });
    setTimeout(() => {
      if (get().activeReaction === reaction) {
        set({ activeReaction: null });
      }
    }, 1800);
  },

  // Accessories
  accessories: {
    shades: false,
    headphones: true,
    goldChain: true,
    outfit: "streetwear",
  },
  toggleShades: () =>
    set((s) => ({
      accessories: { ...s.accessories, shades: !s.accessories.shades },
    })),
  toggleHeadphones: () =>
    set((s) => ({
      accessories: { ...s.accessories, headphones: !s.accessories.headphones },
    })),
  toggleGoldChain: () =>
    set((s) => ({
      accessories: { ...s.accessories, goldChain: !s.accessories.goldChain },
    })),
  cycleOutfit: () => {
    const themes: OutfitTheme[] = ["streetwear", "cyberpunk", "fire", "royal"];
    const current = get().accessories.outfit;
    const nextIdx = (themes.indexOf(current) + 1) % themes.length;
    set((s) => ({
      accessories: { ...s.accessories, outfit: themes[nextIdx] },
    }));
  },

  // Camera
  cameraPreset: "stage",
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  // Voice rap
  voiceRapEnabled: true,
  toggleVoiceRap: () => set((s) => ({ voiceRapEnabled: !s.voiceRapEnabled })),

  // Song generation
  currentSongId: null,
  currentSong: null,
  generationStatus: "idle",
  generationProgress: 0,
  generationError: null,

  // Audio
  isPlaying: false,
  audioCurrentTime: 0,
  audioDuration: 0,
  audioVolume: 0.85,
  audioAmplitude: 0,
  setIsPlaying: (v) => set({ isPlaying: v }),
  setAudioCurrentTime: (t) => set({ audioCurrentTime: t }),
  setAudioDuration: (d) => set({ audioDuration: d }),
  setAudioVolume: (v) => set({ audioVolume: v }),
  setAudioAmplitude: (amp) => set({ audioAmplitude: amp }),

  // UI panels
  showPersonalityForm: false,
  showLyrics: false,
  showHistory: false,
  showSettings: false,
  openPersonalityForm: () => set({ showPersonalityForm: true }),
  closePersonalityForm: () => set({ showPersonalityForm: false }),
  togglePersonalityForm: () =>
    set((s) => ({ showPersonalityForm: !s.showPersonalityForm })),
  toggleLyrics: () => set((s) => ({ showLyrics: !s.showLyrics })),
  toggleHistory: () => set((s) => ({ showHistory: !s.showHistory })),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

  // History
  songHistory: [],
  addToHistory: (song) =>
    set((s) => ({
      songHistory: [song, ...s.songHistory.filter((x) => x.id !== song.id)].slice(0, 20),
    })),
  loadHistory: async () => {
    try {
      const res = await fetch("/api/songs");
      if (res.ok) {
        const data = await res.json();
        if (data.songs && Array.isArray(data.songs)) {
          set({ songHistory: data.songs });
        }
      }
    } catch {
      // ignore
    }
  },

  // Form
  formData: {
    language: "english",
    rap_style: "funny_comedy",
    mood: "funny",
    roast_level: "mild",
    requested_duration_seconds: 60,
  },
  setFormData: (data) =>
    set((s) => ({ formData: { ...s.formData, ...data } })),

  // Actions
  startGeneration: async (input) => {
    set({
      generationStatus: "submitting",
      generationError: null,
      generationProgress: 5,
      characterState: "listening",
      showPersonalityForm: false,
      showLyrics: false,
    });

    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start generation");
      }

      set({
        currentSongId: data.id,
        generationStatus: "generating_lyrics",
        generationProgress: 15,
        characterState: "thinking",
      });

      // Start polling
      get().pollSongStatus(data.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      set({
        generationStatus: "failed",
        generationError: message,
        characterState: "error",
      });
    }
  },

  pollSongStatus: async (songId: string) => {
    const startTime = Date.now();

    const poll = async () => {
      if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
        set({
          generationStatus: "failed",
          generationError: "Generation timed out. Please try again.",
          characterState: "error",
        });
        return;
      }

      try {
        const res = await fetch(`/api/songs/${songId}/status`);
        const data = await res.json();

        if (!res.ok) {
          set({
            generationStatus: "failed",
            generationError: data.error ?? "Failed to check status",
            characterState: "error",
          });
          return;
        }

        const statusMap: Record<string, GenerationStatus> = {
          pending: "submitting",
          generating_lyrics: "generating_lyrics",
          generating_music: "generating_music",
          processing_audio: "processing_audio",
          completed: "completed",
          failed: "failed",
        };

        const genStatus = statusMap[data.status] ?? "submitting";
        const charStateMap: Record<GenerationStatus, CharacterState> = {
          idle: "idle",
          submitting: "listening",
          generating_lyrics: "thinking",
          generating_music: "excited",
          processing_audio: "excited",
          completed: "performing",
          failed: "error",
        };

        set({
          generationStatus: genStatus,
          generationProgress: data.progress ?? 0,
          characterState: charStateMap[genStatus] ?? "thinking",
        });

        if (data.status === "completed") {
          const song: SongRecord = {
            id: songId,
            title: data.title ?? "Your Rap",
            status: data.status,
            progress: 100,
            audio_url: data.audio_url,
            audio_path: data.audio_path,
            lyrics: data.lyrics,
            mood: get().formData.mood ?? "funny",
            rap_style: get().formData.rap_style ?? "funny_comedy",
            language: get().formData.language ?? "english",
            created_at: new Date().toISOString(),
            completed_at: data.completed_at,
            error_code: null,
            error_message: null,
          };

          set({
            currentSong: song,
            showLyrics: true,
            isPlaying: true,
          });

          get().addToHistory(song);
          return;
        }

        if (data.status === "failed") {
          set({
            generationStatus: "failed",
            generationError: data.error_message ?? "Generation failed",
            characterState: "error",
          });
          return;
        }

        // Continue polling
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // Network error retry
        setTimeout(poll, POLL_INTERVAL_MS * 1.5);
      }
    };

    poll();
  },

  selectSong: (song) => {
    set({
      currentSong: song,
      currentSongId: song.id,
      generationStatus: "completed",
      characterState: "performing",
      showLyrics: true,
      isPlaying: false,
    });
  },

  reset: () => {
    set({
      currentSongId: null,
      currentSong: null,
      generationStatus: "idle",
      generationProgress: 0,
      generationError: null,
      characterState: "idle",
      isPlaying: false,
      audioCurrentTime: 0,
      audioDuration: 0,
      showPersonalityForm: false,
      showLyrics: false,
    });
  },
}));
