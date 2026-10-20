import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  StructuredLyricsSchema,
  type StructuredLyrics,
  type CreateSongInput,
} from "../validation/schemas";

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.9,
      topP: 0.95,
    },
  });
}

function buildLyricsPrompt(input: CreateSongInput): string {
  const parts: string[] = [];

  parts.push(`You are a world-class rap songwriter and lyricist.`);
  parts.push(
    `Write a personalized rap song based on the following person's personality and characteristics.`
  );
  parts.push(`\n## Person Description:`);
  parts.push(input.personality_input);

  if (input.character_name) {
    parts.push(`\nName/Nickname: ${input.character_name}`);
  }
  if (input.funny_habits) {
    parts.push(`Funny habits: ${input.funny_habits}`);
  }
  if (input.memorable_incidents) {
    parts.push(`Memorable incidents: ${input.memorable_incidents}`);
  }
  if (input.relationship) {
    parts.push(`Relationship to songwriter: ${input.relationship}`);
  }

  parts.push(`\n## Song Requirements:`);
  parts.push(`- Language: ${input.language}`);
  parts.push(`- Rap style: ${input.rap_style.replace("_", " ")}`);
  parts.push(`- Mood: ${input.mood}`);
  parts.push(`- Roast level: ${input.roast_level} (clean=wholesome, mild=light teasing, spicy=friendly roast)`);
  parts.push(
    `- Target duration: approximately ${input.requested_duration_seconds} seconds`
  );

  parts.push(`\n## Output Requirements:`);
  parts.push(
    `- Make lyrics rhythmic, funny where appropriate, and genuinely personalized`
  );
  parts.push(
    `- For Hinglish/Hindi/Desi styles, freely mix languages naturally`
  );
  parts.push(`- Avoid hateful, threatening, or sexually explicit content`);
  parts.push(
    `- The 'prompt_for_music_provider' field should be a concise music style description for a text-to-music AI: e.g., "upbeat desi hip-hop, 808 bass, tabla beats, catchy hook, 92 BPM"`
  );
  parts.push(
    `- Return a JSON object with: { "title": string, "description": string, "sections": [ { "type": "intro"|"verse"|"chorus"|"bridge"|"outro", "label": string, "lines": string[] } ], "language": string, "style": string, "mood": string, "energy": "low"|"medium"|"high", "estimated_duration_seconds": number, "prompt_for_music_provider": string }`
  );

  parts.push(`\nReturn valid JSON matching the schema exactly.`);
  return parts.join("\n");
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/i, "");
  }
  return cleaned.trim();
}

/**
 * Procedural fallback lyric generator when Gemini API is unavailable or offline.
 * Produces personalized, rhyming, stylistic lyrics tailored to the user's inputs.
 */
function generateProceduralLyrics(input: CreateSongInput): StructuredLyrics {
  const name = input.character_name?.trim() || "My Guy";
  const desc = input.personality_input.trim();
  const habit = input.funny_habits ? `They say: "${input.funny_habits}"` : "Always in the zone, check the clock it's 2 AM";
  const incident = input.memorable_incidents ? `Remember that time: ${input.memorable_incidents}` : "Making legendary moves wherever they step";

  const isHinglish = input.language === "hinglish" || input.language === "hindi" || input.rap_style === "desi_hiphop";

  let title = `${name}'s Anthem (The Vibe Drop)`;
  let stylePrompt = "fast bouncy hip-hop, heavy 808 kicks, crisp hi-hats, melodic synth, 94 BPM";

  let introLines: string[];
  let verse1Lines: string[];
  let chorusLines: string[];
  let verse2Lines: string[];
  let outroLines: string[];

  if (isHinglish) {
    title = `Apun Ka Bhai ${name} (Desi Cypher)`;
    stylePrompt = "hard hitting desi hip hop, dholak roll, 808 sub, flute hook, energetic flow, 96 BPM";
    introLines = [
      `Mic check, ek do teen!`,
      `Sabhi log side ho jao, picture abhi baaki hai!`,
      `This one is for ${name}, the one and only legend!`,
    ];
    verse1Lines = [
      `Sun lo re public, ye hai ${name} ki kahani,`,
      `Alag hi swag hai, alag hi manmaani!`,
      `${desc.slice(0, 70)}... swag pura desi,`,
      `Late aana inka habit, par entry rehti crazy!`,
      `${habit}`,
      `Sabka attention leke baje inka hi danka!`,
    ];
    chorusLines = [
      `Bhai ka vibe hai sabse alag (sabse alag!)`,
      `${name} on the beat, spotlight on the block!`,
      `Jab bhi nikle galli se, hustle never stops,`,
      `Vibe2Verse pe aaya boy, hitting all the tops!`,
    ];
    verse2Lines = [
      `Roast karu thoda ya batau inka secret?`,
      `${incident}`,
      `Dial kare dost toh phone rehta silent,`,
      `Par party mein entry jaise scene ho jaye violent!`,
      `Dil ke hai saaf, chahe baatein thodi salty,`,
      `Har ek mistake pe bolte: "Bro, meri nahi thi galti!"`,
    ];
    outroLines = [
      `Ha ha! That is ${name} for you!`,
      `Straight from the heart, Vibe2Verse on the track!`,
      `Peace out!`,
    ];
  } else {
    introLines = [
      `Yeah, turn the monitor up in the headphones...`,
      `Antigravity studio, 3D boy in the booth!`,
      `They asked me who's got the wild vibe? It's ${name}! Let's get it!`,
    ];
    verse1Lines = [
      `Step in the room and the energy flips,`,
      `Talking 'bout ${name} with the legendary quips!`,
      `${desc.slice(0, 80)}... that's the whole summary,`,
      `Moving so unpredictable, straight up mastery!`,
      `${habit}`,
      `Never hitting snooze on the rhythm of life, we flex on repeat!`,
    ];
    chorusLines = [
      `That's the ${name} vibe, yeah you know what it is!`,
      `Lighting up the city, handle business with fizz!`,
      `From the bottom to the top, hear the bass drop low,`,
      `Ain't nobody rocking like this in the whole front row!`,
    ];
    verse2Lines = [
      `Wait, let me roast you just a little bit quick,`,
      `Got 99 excuses and every single one is slick!`,
      `${incident}`,
      `Always saying "I'll be there in just five minutes flat",`,
      `An hour later still searching where the keys were at!`,
      `But we love the character, unbothered and true!`,
    ];
    outroLines = [
      `Yeah! Vibe2Verse cypher!`,
      `Big shoutout to ${name}, hold your crown!`,
      `Dropping the mic, we outta here!`,
    ];
  }

  return {
    title,
    description: `A customized ${input.mood} ${input.rap_style.replace("_", " ")} rap for ${name}.`,
    sections: [
      { type: "intro", label: "Intro", lines: introLines },
      { type: "verse", label: "Verse 1", lines: verse1Lines },
      { type: "chorus", label: "Chorus", lines: chorusLines },
      { type: "verse", label: "Verse 2", lines: verse2Lines },
      { type: "outro", label: "Outro", lines: outroLines },
    ],
    language: input.language,
    style: input.rap_style,
    mood: input.mood,
    energy: input.mood === "energetic" || input.mood === "celebratory" ? "high" : "medium",
    estimated_duration_seconds: input.requested_duration_seconds,
    prompt_for_music_provider: stylePrompt,
  };
}

export async function generateLyrics(
  input: CreateSongInput
): Promise<StructuredLyrics> {
  const model = getGeminiModel();

  if (!model) {
    console.info("[LyricsAI] No GEMINI_API_KEY set. Using intelligent procedural lyric generator.");
    return generateProceduralLyrics(input);
  }

  try {
    const prompt = buildLyricsPrompt(input);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = cleanJsonResponse(text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[LyricsAI] Gemini returned non-JSON. Falling back to procedural lyrics.");
      return generateProceduralLyrics(input);
    }

    const validated = StructuredLyricsSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[LyricsAI] Schema validation warning, adapting or falling back:", validated.error.message);
      return generateProceduralLyrics(input);
    }

    return validated.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LyricsAI] Error calling Gemini API:", msg);
    console.info("[LyricsAI] Seamlessly continuing with procedural lyrics engine.");
    return generateProceduralLyrics(input);
  }
}

export function lyricsToPlainText(lyrics: StructuredLyrics): string {
  const lines: string[] = [`# ${lyrics.title}`, ""];
  for (const section of lyrics.sections) {
    lines.push(`[${section.label}]`);
    lines.push(...section.lines);
    lines.push("");
  }
  return lines.join("\n").trim();
}
