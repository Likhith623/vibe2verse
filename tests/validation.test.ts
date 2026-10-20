import { CreateSongSchema } from "../lib/validation/schemas";

describe("CreateSongSchema validation", () => {
  const validInput = {
    personality_input:
      "Rahul is always late, loves biryani, acts overconfident, makes everyone laugh.",
    character_name: "Rahul",
    language: "english",
    rap_style: "funny_comedy",
    mood: "funny",
    roast_level: "mild",
    requested_duration_seconds: 60,
  };

  it("accepts valid input", () => {
    const result = CreateSongSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects personality_input that is too short", () => {
    const result = CreateSongSchema.safeParse({
      ...validInput,
      personality_input: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects personality_input that is too long", () => {
    const result = CreateSongSchema.safeParse({
      ...validInput,
      personality_input: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects disallowed content", () => {
    const result = CreateSongSchema.safeParse({
      ...validInput,
      personality_input: "This person is very hate filled and wants to kill everyone",
    });
    expect(result.success).toBe(false);
  });

  it("uses default values when optional fields are omitted", () => {
    const result = CreateSongSchema.safeParse({
      personality_input: "A perfectly normal person who likes cats.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("english");
      expect(result.data.rap_style).toBe("funny_comedy");
      expect(result.data.mood).toBe("funny");
      expect(result.data.roast_level).toBe("mild");
      expect(result.data.requested_duration_seconds).toBe(60);
    }
  });

  it("clamps duration between 30 and 180", () => {
    const tooShort = CreateSongSchema.safeParse({
      ...validInput,
      requested_duration_seconds: 10,
    });
    const tooLong = CreateSongSchema.safeParse({
      ...validInput,
      requested_duration_seconds: 600,
    });
    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it("rejects invalid rap_style", () => {
    const result = CreateSongSchema.safeParse({
      ...validInput,
      rap_style: "not_a_style",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid languages", () => {
    const languages = ["english", "hindi", "hinglish", "punjabi", "tamil", "telugu"];
    for (const language of languages) {
      const result = CreateSongSchema.safeParse({ ...validInput, language });
      expect(result.success).toBe(true);
    }
  });
});
