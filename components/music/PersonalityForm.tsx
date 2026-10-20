"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSongStore } from "@/stores/songStore";
import type { CreateSongInput } from "@/lib/validation/schemas";

const RAP_STYLES = [
  { value: "funny_comedy", label: "😂 Comedy Rap" },
  { value: "friendly_roast", label: "🔥 Friendly Roast" },
  { value: "desi_hiphop", label: "🎵 Desi Hip-Hop" },
  { value: "trap", label: "💎 Trap Banger" },
  { value: "old_school", label: "🎤 Old School Boom-Bap" },
  { value: "chill", label: "😎 Chill Vibe" },
  { value: "energetic_party", label: "🎉 Party Anthem" },
] as const;

const MOODS = [
  { value: "funny", label: "😄 Funny" },
  { value: "confident", label: "😏 Confident" },
  { value: "energetic", label: "⚡ Energetic" },
  { value: "chill", label: "🌊 Chill" },
  { value: "dramatic", label: "🎭 Dramatic" },
  { value: "affectionate", label: "💖 Affectionate" },
  { value: "motivational", label: "💪 Motivational" },
  { value: "celebratory", label: "🥳 Celebratory" },
] as const;

const LANGUAGES = [
  { value: "english", label: "🇬🇧 English" },
  { value: "hinglish", label: "✨ Hinglish (Bollywood/Desi)" },
  { value: "hindi", label: "🇮🇳 Hindi" },
  { value: "punjabi", label: "🎶 Punjabi" },
  { value: "tamil", label: "🌺 Tamil" },
  { value: "telugu", label: "🌟 Telugu" },
] as const;

const ROAST_LEVELS = [
  { value: "clean", label: "😇 Wholesome (No Roasts)" },
  { value: "mild", label: "🌶️ Mild Tease (Playful)" },
  { value: "spicy", label: "🔥 Spicy Roast (Savage Comedy)" },
] as const;

const EXAMPLE_PROMPTS = [
  {
    name: "Rahul",
    desc: "Always late to every meeting, acts overconfident, makes everyone laugh, and sleeps through every alarm.",
    habits: "Takes 20 food photos before anyone can touch the biryani",
    incident: "Locked his keys inside the car at midnight and blamed the car for betrayal",
    style: "funny_comedy" as const,
    lang: "hinglish" as const,
    roast: "mild" as const,
  },
  {
    name: "Priya",
    desc: "Speaks fluent memes, never replies on WhatsApp, eats everything in sight and has 147 browser tabs open.",
    habits: "Starts every sentence with 'literally no offense but...'",
    incident: "Accidentally double-tapped an Instagram photo from 2016 at 3 AM",
    style: "friendly_roast" as const,
    lang: "english" as const,
    roast: "spicy" as const,
  },
  {
    name: "Bunty",
    desc: "Street-smart sneakerhead who acts like the biggest rapper in town and speaks in hip-hop rhymes.",
    habits: "Wearing dark sunglasses indoors at night",
    incident: "Tried to breakdance at a cousin's wedding and ripped his jacket",
    style: "desi_hiphop" as const,
    lang: "hinglish" as const,
    roast: "mild" as const,
  },
];

interface PersonalityFormProps {
  onClose?: () => void;
}

export default function PersonalityForm({ onClose }: PersonalityFormProps) {
  const { formData, setFormData, startGeneration, generationStatus } = useSongStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [charCount, setCharCount] = useState((formData.personality_input ?? "").length);

  const isGenerating = generationStatus !== "idle" && generationStatus !== "failed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.personality_input || formData.personality_input.trim().length < 10) {
      newErrors.personality_input = "Please describe the person with at least 10 characters.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    await startGeneration(formData as CreateSongInput);
  };

  const loadExample = (ex: (typeof EXAMPLE_PROMPTS)[0]) => {
    setFormData({
      character_name: ex.name,
      personality_input: ex.desc,
      funny_habits: ex.habits,
      memorable_incidents: ex.incident,
      rap_style: ex.style,
      language: ex.lang,
      roast_level: ex.roast,
      requested_duration_seconds: 60,
    });
    setCharCount(ex.desc.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md text-slate-800"
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-bold text-slate-900 text-base">Generate Personalized Rap</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs transition-colors"
            title="Minimize"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Quick Example Loaders */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Quick Personas
            </span>
            <span className="text-[11px] text-slate-400">One-click fill:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadExample(ex)}
                disabled={isGenerating}
                className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all font-medium whitespace-nowrap shadow-xs"
              >
                ⚡ {ex.name}
              </button>
            ))}
          </div>
        </div>

        {/* Name / Nickname */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Person's Name or Nickname
          </label>
          <input
            type="text"
            value={formData.character_name ?? ""}
            onChange={(e) => setFormData({ character_name: e.target.value })}
            placeholder="e.g. Rahul, Priya, Bunty..."
            maxLength={50}
            disabled={isGenerating}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-xs"
          />
        </div>

        {/* Personality description */}
        <div>
          <label className="block text-xs font-semibold text-purple-700 mb-1">
            Personality Traits & Quirks *
          </label>
          <textarea
            id="personality-input"
            value={formData.personality_input ?? ""}
            onChange={(e) => {
              setFormData({ personality_input: e.target.value });
              setCharCount(e.target.value.length);
            }}
            placeholder="What makes them special? Are they always late, crazy dancer, coffee addict, gym freak, drama queen?"
            rows={3}
            maxLength={1000}
            disabled={isGenerating}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm resize-none focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-xs"
          />
          <div className="flex justify-between items-center mt-1">
            {errors.personality_input ? (
              <p className="text-red-500 text-xs font-medium">{errors.personality_input}</p>
            ) : (
              <span className="text-[11px] text-slate-400">Min 10 characters</span>
            )}
            <p className="text-slate-400 text-[11px]">{charCount}/1000</p>
          </div>
        </div>

        {/* Style & Language */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rap Style</label>
            <select
              value={formData.rap_style ?? "funny_comedy"}
              onChange={(e) => setFormData({ rap_style: e.target.value as CreateSongInput["rap_style"] })}
              disabled={isGenerating}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-purple-500 transition-all shadow-xs"
            >
              {RAP_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
            <select
              value={formData.language ?? "english"}
              onChange={(e) => setFormData({ language: e.target.value as CreateSongInput["language"] })}
              disabled={isGenerating}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-purple-500 transition-all shadow-xs"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mood & Roast Level */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mood</label>
            <select
              value={formData.mood ?? "funny"}
              onChange={(e) => setFormData({ mood: e.target.value as CreateSongInput["mood"] })}
              disabled={isGenerating}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-purple-500 transition-all shadow-xs"
            >
              {MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Roast Intensity</label>
            <select
              value={formData.roast_level ?? "mild"}
              onChange={(e) => setFormData({ roast_level: e.target.value as CreateSongInput["roast_level"] })}
              disabled={isGenerating}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-purple-500 transition-all shadow-xs"
            >
              {ROAST_LEVELS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expandable Extra Details */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 font-semibold"
          >
            <span>{showAdvanced ? "▼" : "▶"}</span>
            <span>{showAdvanced ? "Hide Extra Details" : "+ Add Funny Habits & Incidents"}</span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2.5 mt-2 pt-2 border-t border-slate-200 overflow-hidden"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Funny Habits (e.g. Always loses keys, takes 50 selfies)
                  </label>
                  <input
                    type="text"
                    value={formData.funny_habits ?? ""}
                    onChange={(e) => setFormData({ funny_habits: e.target.value })}
                    placeholder="Quirky habits they have..."
                    maxLength={300}
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-purple-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Memorable Incident (e.g. Fell into pool at graduation)
                  </label>
                  <input
                    type="text"
                    value={formData.memorable_incidents ?? ""}
                    onChange={(e) => setFormData({ memorable_incidents: e.target.value })}
                    placeholder="That one hilarious story everyone remembers..."
                    maxLength={500}
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-purple-500 shadow-xs"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Slider */}
        <div className="pt-1">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span className="font-medium">Duration</span>
            <span className="font-bold text-purple-700">
              {formData.requested_duration_seconds ?? 60} seconds
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={180}
            step={15}
            value={formData.requested_duration_seconds ?? 60}
            onChange={(e) => setFormData({ requested_duration_seconds: parseInt(e.target.value) })}
            disabled={isGenerating}
            className="w-full accent-purple-600"
          />
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isGenerating}
          whileHover={{ scale: isGenerating ? 1 : 1.02 }}
          whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          className="w-full py-3.5 rounded-xl text-white font-bold text-base relative overflow-hidden transition-all shadow-lg disabled:opacity-70 mt-2 cursor-pointer"
          style={{
            background: isGenerating
              ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
              : "linear-gradient(135deg, #7c3aed, #ec4899, #f43f5e)",
            boxShadow: isGenerating ? "none" : "0 10px 25px -5px rgba(124, 58, 237, 0.4)",
          }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                ⚙️
              </motion.span>
              Creating Your Custom Rap...
            </span>
          ) : (
            "🎤 Drop The Beat & Generate Rap"
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
