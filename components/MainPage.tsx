"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSongStore,
  type CameraPreset,
  type SongRecord,
} from "@/stores/songStore";
import PersonalityForm from "@/components/music/PersonalityForm";
import GenerationStatus from "@/components/music/GenerationStatus";
import AudioControls from "@/components/music/AudioControls";
import LyricsPanel from "@/components/music/LyricsPanel";

// Dynamic import for Three.js 3D Scene
const Scene = dynamic(() => import("@/components/character/Scene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f8fafc]">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Opening 3D Rap Studio...</p>
      </div>
    </div>
  ),
});

// ── Synthesized sound effect for character poke ────────────────
function playPokeSfx(type: "pop" | "bounce" | "slide") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "pop") {
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === "bounce") {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    } else {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch {
    // ignore
  }
}

function TopBar({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { reset, generationStatus, songHistory } = useSongStore();

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3.5 bg-white/75 backdrop-blur-xl border-b border-slate-200/80 shadow-xs pointer-events-auto">
      {/* Brand Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={reset}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md border border-purple-200 text-white"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #ec4899)",
            boxShadow: "0 6px 16px -2px rgba(124, 58, 237, 0.35)",
          }}
        >
          🎤
        </div>
        <div>
          <span
            className="text-xl font-black tracking-tight text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(135deg, #7c3aed, #ec4899, #f43f5e)",
            }}
          >
            Vibe2Verse
          </span>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">
            AI 3D Rap Cypher
          </p>
        </div>
      </motion.div>

      {/* Top Actions */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2.5"
      >
        {/* History Button */}
        <button
          onClick={onOpenHistory}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
          title="Past generated songs"
        >
          <span>📜 Cyphers</span>
          {songHistory.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
              {songHistory.length}
            </span>
          )}
        </button>

        {/* New Rap Button */}
        {generationStatus !== "idle" && (
          <button
            onClick={reset}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:brightness-110 transition-all border border-purple-400/40"
          >
            + New Rap
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ── Virtual Pet Quick Control Panel (Talking Tom style) ────────
function VirtualPetControls() {
  const {
    accessories,
    toggleShades,
    toggleHeadphones,
    cycleOutfit,
    triggerReaction,
    cameraPreset,
    setCameraPreset,
  } = useSongStore();

  const cameraOptions: { key: CameraPreset; label: string; icon: string }[] = [
    { key: "stage", label: "Stage", icon: "🎭" },
    { key: "closeup", label: "Close", icon: "🔍" },
    { key: "side", label: "Side", icon: "📐" },
    { key: "orbit", label: "Orbit", icon: "🔄" },
  ];

  return (
    <div className="absolute top-20 right-5 z-20 flex flex-col gap-2.5 pointer-events-auto">
      {/* Pet Accessories Toolbar */}
      <div className="bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 flex flex-col gap-1.5 shadow-lg">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center px-1">
          Swag
        </p>

        {/* Shades */}
        <button
          onClick={toggleShades}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all border ${
            accessories.shades
              ? "bg-purple-100 border-purple-300 text-purple-700 shadow-xs"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title="Toggle Sunglasses"
        >
          🕶️
        </button>

        {/* Headphones */}
        <button
          onClick={toggleHeadphones}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all border ${
            accessories.headphones
              ? "bg-purple-100 border-purple-300 text-purple-700 shadow-xs"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title="Toggle Studio Headphones"
        >
          🎧
        </button>

        {/* Outfit Cycle */}
        <button
          onClick={cycleOutfit}
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center text-base transition-all shadow-xs"
          title={`Cycle Outfit (${accessories.outfit})`}
        >
          👕
        </button>

        {/* Spin / Dance Move */}
        <button
          onClick={() => {
            playPokeSfx("slide");
            triggerReaction("spin");
          }}
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center text-base transition-all shadow-xs"
          title="Do a 360 Spin Move"
        >
          🕺
        </button>
      </div>

      {/* Camera Angle Presets */}
      <div className="bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 flex flex-col gap-1.5 shadow-lg">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center px-1">
          Cam
        </p>
        {cameraOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setCameraPreset(opt.key)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all border ${
              cameraPreset === opt.key
                ? "bg-purple-100 border-purple-300 text-purple-700 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title={`Switch to ${opt.label} view`}
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Song History Drawer ────────────────────────────────────────
function HistoryDrawer({
  isOpen,
  onClose,
  onSelectSong,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongRecord) => void;
}) {
  const { songHistory, loadHistory } = useSongStore();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="text-slate-900 font-bold text-base">Cypher Vault</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="flex-1 py-4 space-y-2.5">
              {songHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-3xl mb-2">🎤</p>
                  <p className="text-sm font-semibold text-slate-700">No saved cyphers yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click the button below to generate your first rap!
                  </p>
                </div>
              ) : (
                songHistory.map((song) => (
                  <motion.div
                    key={song.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 cursor-pointer transition-all space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-slate-900 font-bold text-sm truncate">
                        {song.title ?? "Untitled Rap"}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                        {song.rap_style.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs truncate">
                      {song.personality_input ?? "Personalized rap"}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-medium">
                      <span>{song.language}</span>
                      <span className="text-purple-600 font-semibold">▶ Tap to play</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Page Export ───────────────────────────────────────────
export default function MainPage() {
  const {
    characterState,
    isPlaying,
    generationStatus,
    showPersonalityForm,
    openPersonalityForm,
    closePersonalityForm,
    currentSong,
    triggerReaction,
    selectSong,
  } = useSongStore();

  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [pokeToast, setPokeToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Handle body part poke (Talking Tom interactivity)
  const handlePartClick = useCallback(
    (part: "head" | "body" | "feet") => {
      if (part === "head") {
        playPokeSfx("pop");
        triggerReaction("dizzy");
        setPokeToast("🤪 'Yo who touched the fresh cap?!'");
      } else if (part === "body") {
        playPokeSfx("bounce");
        triggerReaction("chestbump");
        setPokeToast("💥 'Watch the hoodie, custom drip only!'");
      } else {
        playPokeSfx("slide");
        triggerReaction("moonwalk");
        setPokeToast("👟 'Fresh kicks! Can't crease these sneakers!'");
      }

      setTimeout(() => setPokeToast(null), 1800);
    },
    [triggerReaction]
  );

  const isGenerating =
    generationStatus !== "idle" &&
    generationStatus !== "completed" &&
    generationStatus !== "failed";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f8fafc] select-none text-slate-900">
      {/* 3D Scene Layer — Full Screen & Unobstructed */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <Scene
            characterState={characterState}
            isPlaying={isPlaying}
            audioAmplitude={audioAmplitude}
            onPartClick={handlePartClick}
          />
        </Suspense>

        {/* Poke Reaction Speech Bubble / Toast */}
        <AnimatePresence>
          {pokeToast && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              className="absolute top-[28%] left-1/2 -translate-x-1/2 pointer-events-none z-30 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-purple-200 text-purple-900 text-sm font-bold shadow-xl shadow-purple-500/10"
            >
              {pokeToast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top Bar */}
      <TopBar onOpenHistory={() => setHistoryOpen(true)} />

      {/* Virtual Pet Customization Tools */}
      <VirtualPetControls />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSong={selectSong}
      />

      {/* Bottom Interface Layer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-6 px-4 gap-2.5 pointer-events-auto">
        <AnimatePresence mode="wait">
          {/* Popped up form (Only when user clicked the bottom button) */}
          {showPersonalityForm && generationStatus === "idle" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="w-full max-w-md max-h-[76vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300"
            >
              <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xl">
                <PersonalityForm onClose={closePersonalityForm} />
              </div>
            </motion.div>
          )}

          {/* Generating / Status Progress */}
          {isGenerating && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-md"
            >
              <GenerationStatus />
            </motion.div>
          )}

          {/* Failed State */}
          {generationStatus === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md"
            >
              <GenerationStatus />
            </motion.div>
          )}

          {/* Completed: Audio Player & Lyrics Panel */}
          {generationStatus === "completed" && (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-md space-y-2.5"
            >
              <AudioControls
                audioUrl={currentSong?.audio_url ?? "/audio/beat-comedy.wav"}
                songTitle={currentSong?.title}
                onAmplitude={(amp) => setAudioAmplitude(amp)}
              />
              <LyricsPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Small Bottom Floating Button to Pop up the Form (When idle and not already open) */}
        {!showPersonalityForm && generationStatus === "idle" && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: [0, -4, 0],
            }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
            }}
            onClick={openPersonalityForm}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="px-7 py-3 rounded-full text-white font-bold text-sm shadow-xl flex items-center gap-2.5 cursor-pointer border border-white/60 transition-all"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #ec4899, #f43f5e)",
              boxShadow: "0 10px 25px -4px rgba(124, 58, 237, 0.45)",
            }}
          >
            <span className="text-base">🎤</span>
            <span>Create Your Rap</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
              Tap here
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
