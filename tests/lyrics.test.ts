import { lyricsToPlainText } from "../lib/ai/lyrics";
import type { StructuredLyrics } from "../lib/validation/schemas";

describe("Lyrics utility and formatting", () => {
  const sampleLyrics: StructuredLyrics = {
    title: "Rahul's Anthem",
    description: "A funny comedy rap about Rahul",
    sections: [
      {
        type: "intro",
        label: "Intro",
        lines: ["Mic check one two", "Rahul in the house!"],
      },
      {
        type: "verse",
        label: "Verse 1",
        lines: ["Always late to the show", "Moving super slow"],
      },
      {
        type: "chorus",
        label: "Chorus",
        lines: ["Rahul on the beat, yeah you know the name", "Playing his own game"],
      },
      {
        type: "outro",
        label: "Outro",
        lines: ["Drop the mic, peace out!"],
      },
    ],
    language: "english",
    style: "funny_comedy",
    mood: "funny",
    energy: "medium",
    estimated_duration_seconds: 60,
    prompt_for_music_provider: "upbeat boombap hip-hop, 92 BPM",
  };

  it("formats structured lyrics into plain text correctly", () => {
    const text = lyricsToPlainText(sampleLyrics);
    expect(text).toContain("# Rahul's Anthem");
    expect(text).toContain("[Intro]");
    expect(text).toContain("Mic check one two");
    expect(text).toContain("[Chorus]");
    expect(text).toContain("[Outro]");
  });

  it("handles empty sections gracefully", () => {
    const text = lyricsToPlainText({
      ...sampleLyrics,
      sections: [],
    });
    expect(text).toBe("# Rahul's Anthem");
  });

  it("generates structured lyrics using procedural engine when Gemini API key is missing", async () => {
    const { generateLyrics } = await import("../lib/ai/lyrics");
    const lyrics = await generateLyrics({
      personality_input: "Always late, loves biryani, acts overconfident, makes everyone laugh.",
      character_name: "Rahul",
      language: "hinglish",
      rap_style: "desi_hiphop",
      mood: "funny",
      roast_level: "mild",
      requested_duration_seconds: 60,
    });

    expect(lyrics).toBeDefined();
    expect(lyrics.title).toContain("Rahul");
    expect(lyrics.sections.length).toBeGreaterThanOrEqual(4);
    expect(lyrics.sections.some((s) => s.type === "chorus")).toBe(true);
    expect(lyrics.prompt_for_music_provider).toBeDefined();
  });
});
