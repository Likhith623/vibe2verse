"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSongStore } from "@/stores/songStore";

export default function LyricsPanel() {
  const { currentSong, showLyrics, toggleLyrics, audioCurrentTime, audioDuration, isPlaying } =
    useSongStore();
  const [copied, setCopied] = useState(false);

  const lyrics = currentSong?.lyrics;

  // Flatten lines with timing estimates for karaoke highlighting
  const flattenedLines = useMemo(() => {
    if (!lyrics) return [];
    const items: { sectionLabel: string; line: string; index: number }[] = [];
    let idx = 0;
    for (const sec of lyrics.sections) {
      for (const line of sec.lines) {
        items.push({ sectionLabel: sec.label, line, index: idx++ });
      }
    }
    return items;
  }, [lyrics]);

  const activeLineIndex = useMemo(() => {
    if (!isPlaying || flattenedLines.length === 0) return -1;
    const dur = audioDuration > 0 ? audioDuration : 32;
    const progress = Math.min(1, Math.max(0, audioCurrentTime / dur));
    return Math.floor(progress * flattenedLines.length);
  }, [audioCurrentTime, audioDuration, flattenedLines.length, isPlaying]);

  const copyLyrics = () => {
    if (!lyrics) return;
    const text = lyrics.sections
      .map((s) => `[${s.label}]\n${s.lines.join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(`${lyrics.title}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentSong) return null;

  return (
    <div className="w-full max-w-md">
      {/* Toggle Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLyrics}
          className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 text-sm hover:bg-slate-50 transition-colors shadow-xs"
        >
          <span className="flex items-center gap-2">
            <span>📜</span>
            <span className="font-semibold">{showLyrics ? "Hide Lyrics" : "Show Lyrics"}</span>
            {lyrics && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-bold">
                {lyrics.sections.length} verses
              </span>
            )}
          </span>
          <motion.span
            animate={{ rotate: showLyrics ? 180 : 0 }}
            className="text-slate-400 text-xs"
          >
            ▾
          </motion.span>
        </button>

        {lyrics && (
          <button
            onClick={copyLyrics}
            className="px-3 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Copy full lyrics"
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        )}
      </div>

      {/* Expandable Lyrics Content with Karaoke sync */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-1.5"
          >
            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto shadow-xl scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
              {lyrics ? (
                <div className="space-y-4">
                  {lyrics.sections.map((section, sIdx) => {
                    return (
                      <div key={sIdx} className="space-y-1">
                        <p className="text-purple-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          {section.label}
                        </p>
                        <div className="space-y-1 pl-3 border-l-2 border-purple-100">
                          {section.lines.map((line, lIdx) => {
                            const globalIdx = flattenedLines.findIndex(
                              (f) => f.sectionLabel === section.label && f.line === line
                            );
                            const isActive = globalIdx === activeLineIndex;

                            return (
                              <p
                                key={lIdx}
                                className={`text-sm leading-relaxed transition-all duration-200 ${
                                  isActive
                                    ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600 font-bold scale-[1.01] pl-1 drop-shadow-xs"
                                    : "text-slate-600"
                                }`}
                              >
                                {isActive && <span className="mr-1.5 text-xs text-purple-600">▶</span>}
                                {line}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">Writing lyrics...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
