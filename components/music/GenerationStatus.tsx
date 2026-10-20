"use client";

import { motion } from "framer-motion";
import { useSongStore } from "@/stores/songStore";

const STATUS_MESSAGES: Record<string, string> = {
  submitting: "Submitting personality traits...",
  generating_lyrics: "Writing personalized rap lyrics...",
  generating_music: "Producing the beat and rhythm...",
  processing_audio: "Mastering the audio track...",
  completed: "🎉 Your rap is ready!",
  failed: "Generation encountered an issue",
};

const STATUS_EMOJI: Record<string, string> = {
  submitting: "📤",
  generating_lyrics: "✍️",
  generating_music: "🎵",
  processing_audio: "🎚️",
  completed: "🎤",
  failed: "⚠️",
};

export default function GenerationStatus() {
  const { generationStatus, generationProgress, generationError, reset } = useSongStore();

  if (generationStatus === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md"
    >
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-5 shadow-2xl">
        {/* Emoji + message */}
        <div className="flex items-center gap-3 mb-3.5">
          <motion.span
            key={generationStatus}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-2xl"
          >
            {STATUS_EMOJI[generationStatus] ?? "⏳"}
          </motion.span>
          <div>
            <p className="text-slate-900 font-bold text-sm">
              {STATUS_MESSAGES[generationStatus] ?? "Processing..."}
            </p>
            {generationStatus !== "failed" && generationStatus !== "completed" && (
              <p className="text-slate-500 text-xs mt-0.5">
                Creating your custom track (~10-30 seconds)
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {generationStatus !== "failed" && (
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${generationProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.5 }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                boxShadow: "0 0 10px rgba(124, 58, 237, 0.4)",
              }}
            />
          </div>
        )}

        {/* Step indicators */}
        {generationStatus !== "failed" && generationStatus !== "completed" && (
          <div className="flex justify-between mt-3">
            {["Lyrics", "Beat", "Vocals"].map((step, i) => {
              const stepProgress = [20, 60, 90][i];
              const active = generationProgress >= stepProgress - 20;
              const done = generationProgress >= stepProgress + 10;
              return (
                <div key={step} className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      done
                        ? "bg-emerald-500"
                        : active
                        ? "bg-purple-600 animate-pulse"
                        : "bg-slate-200"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium transition-colors ${
                      active ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Error state */}
        {generationStatus === "failed" && (
          <div className="mt-3">
            <p className="text-red-500 text-xs mb-3 font-medium">
              {generationError ?? "Generation failed. Please try again."}
            </p>
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
