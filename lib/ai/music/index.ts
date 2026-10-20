import "server-only";
import type { StructuredLyrics } from "../../validation/schemas";

// ── Provider adapter interface ─────────────────────────────────
export interface MusicGenerationResult {
  provider_job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  audio_url?: string;
  error?: string;
}

export interface IMusicProvider {
  name: string;
  generateSong(
    lyrics: StructuredLyrics,
    stylePrompt: string,
    durationSeconds: number
  ): Promise<MusicGenerationResult>;
  getGenerationStatus(jobId: string): Promise<MusicGenerationResult>;
  cancelGeneration?(jobId: string): Promise<void>;
}

// ── Replicate / MusicGen adapter ───────────────────────────────
class ReplicateMusicProvider implements IMusicProvider {
  name = "replicate_musicgen";
  private apiToken: string;

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("Missing REPLICATE_API_TOKEN");
    }
    this.apiToken = process.env.REPLICATE_API_TOKEN;
  }

  async generateSong(
    lyrics: StructuredLyrics,
    stylePrompt: string,
    durationSeconds: number
  ): Promise<MusicGenerationResult> {
    // Use Meta MusicGen Stereo Large on Replicate
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Prefer: "respond-async",
      },
      body: JSON.stringify({
        version:
          "stereo-large", // resolved by model slug below
        // Use model slug format instead
      }),
    });

    // Use model version directly
    const body = {
      model: "meta/musicgen",
      input: {
        prompt: `${stylePrompt}. ${lyrics.prompt_for_music_provider}`,
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "loudness",
        duration: Math.min(durationSeconds, 30), // MusicGen free tier max
      },
    };

    const res = await fetch("https://api.replicate.com/v1/models/meta/musicgen/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Prefer: "respond-async",
      },
      body: JSON.stringify({ input: body.input }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Replicate API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    return {
      provider_job_id: data.id,
      status: this.mapReplicateStatus(data.status),
      audio_url: data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : undefined,
    };
  }

  async getGenerationStatus(jobId: string): Promise<MusicGenerationResult> {
    const res = await fetch(
      `https://api.replicate.com/v1/predictions/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Replicate status check failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      provider_job_id: jobId,
      status: this.mapReplicateStatus(data.status),
      audio_url: data.output
        ? Array.isArray(data.output)
          ? data.output[0]
          : data.output
        : undefined,
      error: data.error || undefined,
    };
  }

  private mapReplicateStatus(
    status: string
  ): MusicGenerationResult["status"] {
    switch (status) {
      case "starting":
      case "processing":
        return "processing";
      case "succeeded":
        return "completed";
      case "failed":
      case "canceled":
        return "failed";
      default:
        return "pending";
    }
  }
}

// ── Mock provider for development/testing ─────────────────────
class MockMusicProvider implements IMusicProvider {
  name = "mock";
  private jobMap = new Map<string, { status: "pending" | "processing" | "completed"; audioUrl: string; polls: number }>();

  async generateSong(
    lyrics: StructuredLyrics
  ): Promise<MusicGenerationResult> {
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let audioUrl = "/audio/beat-comedy.wav";
    if (lyrics.style === "trap") {
      audioUrl = "/audio/beat-trap.wav";
    } else if (lyrics.style === "desi_hiphop" || lyrics.language === "hindi" || lyrics.language === "hinglish") {
      audioUrl = "/audio/beat-desi.wav";
    }

    this.jobMap.set(id, {
      status: "processing",
      audioUrl,
      polls: 0,
    });

    return {
      provider_job_id: id,
      status: "pending",
    };
  }

  async getGenerationStatus(jobId: string): Promise<MusicGenerationResult> {
    const job = this.jobMap.get(jobId);
    if (!job) {
      // Default fallback
      return {
        provider_job_id: jobId,
        status: "completed",
        audio_url: "/audio/beat-comedy.wav",
      };
    }

    job.polls += 1;
    // Complete after 2 poll cycles
    if (job.polls >= 2) {
      job.status = "completed";
      return {
        provider_job_id: jobId,
        status: "completed",
        audio_url: job.audioUrl,
      };
    }

    return {
      provider_job_id: jobId,
      status: "processing",
    };
  }
}

// ── Factory ────────────────────────────────────────────────────
export function getMusicProvider(): IMusicProvider {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.MUSIC_PROVIDER === "mock"
  ) {
    return new MockMusicProvider();
  }

  if (process.env.REPLICATE_API_TOKEN) {
    return new ReplicateMusicProvider();
  }

  // Fall back to mock if no provider configured
  console.warn(
    "⚠️  No music provider configured. Using mock. Set REPLICATE_API_TOKEN in .env.local"
  );
  return new MockMusicProvider();
}
