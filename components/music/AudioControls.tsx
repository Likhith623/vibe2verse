"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useSongStore } from "@/stores/songStore";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioControlsProps {
  audioUrl: string;
  songTitle?: string | null;
  onDownload?: () => void;
  onAmplitude?: (amp: number) => void;
}

export default function AudioControls({
  audioUrl,
  songTitle,
  onDownload,
  onAmplitude,
}: AudioControlsProps) {
  const {
    isPlaying,
    audioCurrentTime,
    audioDuration,
    audioVolume,
    voiceRapEnabled,
    toggleVoiceRap,
    currentSong,
    setIsPlaying,
    setAudioCurrentTime,
    setAudioDuration,
    setAudioVolume,
    setAudioAmplitude,
  } = useSongStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [bars, setBars] = useState<number[]>([10, 20, 15, 30, 45, 25, 35, 20, 15, 30, 25, 40]);

  // ── Web Audio Analyser Setup ──────────────────────────────────
  const setupWebAudio = useCallback(() => {
    if (!audioRef.current || sourceRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.warn("[AudioControls] Web Audio analyser setup skipped/failed:", err);
    }
  }, []);

  // ── Speech Synthesis for Vocal Rap Spoken Over Beat ──────────
  const speechQueueRef = useRef<{ line: string; time: number }[]>([]);
  const lastSpokenIndexRef = useRef<number>(-1);

  // Prepare line timing from lyrics
  useEffect(() => {
    if (!currentSong?.lyrics) return;
    const allLines: string[] = [];
    for (const sec of currentSong.lyrics.sections) {
      for (const line of sec.lines) {
        if (line.trim()) allLines.push(line.trim());
      }
    }
    const duration = audioDuration > 0 ? audioDuration : 30;
    const timePerLine = duration / Math.max(1, allLines.length);

    speechQueueRef.current = allLines.map((line, idx) => ({
      line,
      time: idx * timePerLine,
    }));
    lastSpokenIndexRef.current = -1;
  }, [currentSong?.lyrics, audioDuration]);

  // Trigger speech when voice rap is active
  useEffect(() => {
    if (!voiceRapEnabled || !isPlaying || typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const queue = speechQueueRef.current;
    if (queue.length === 0) return;

    // Find if a line should be spoken at current time
    for (let i = 0; i < queue.length; i++) {
      if (audioCurrentTime >= queue[i].time && i > lastSpokenIndexRef.current) {
        lastSpokenIndexRef.current = i;

        // Cancel previous line and speak this one
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(queue[i].line);
        utter.rate = 1.15; // upbeat rap speed
        utter.pitch = 1.2; // fun young rap voice
        utter.volume = Math.min(1, audioVolume * 1.1);

        // Pick matching voice if available
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))
        );
        if (voice) utter.voice = voice;

        window.speechSynthesis.speak(utter);
        break;
      }
    }
  }, [audioCurrentTime, isPlaying, voiceRapEnabled, audioVolume]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Sync Play / Pause ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
      setupWebAudio();
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isPlaying, setIsPlaying, setupWebAudio]);

  // ── Sync Volume ───────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // ── Audio Amplitude & Visualizer Loop ─────────────────────────
  useEffect(() => {
    const dataArray = new Uint8Array(32);

    const update = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);

        // Bass/vocal punch from first 12 bins
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += dataArray[i];
        }
        const amp = sum / (12 * 255);
        setAudioAmplitude(amp);
        onAmplitude?.(amp);

        // Update visualizer bars
        const nextBars = Array.from({ length: 12 }, (_, i) => {
          return Math.max(8, Math.round((dataArray[i] / 255) * 48));
        });
        setBars(nextBars);
      } else if (isPlaying) {
        // Fallback simulation if Web Audio is blocked by browser policy
        const simulatedAmp = 0.3 + Math.abs(Math.sin(Date.now() * 0.008)) * 0.45;
        setAudioAmplitude(simulatedAmp);
        onAmplitude?.(simulatedAmp);
      } else {
        setAudioAmplitude(0);
        onAmplitude?.(0);
      }

      rafRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(update);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setAudioAmplitude(0);
      onAmplitude?.(0);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, onAmplitude, setAudioAmplitude]);

  // ── Seek ──────────────────────────────────────────────────────
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !audioDuration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = pct * audioDuration;
      audio.currentTime = newTime;
      setAudioCurrentTime(newTime);
      lastSpokenIndexRef.current = -1;
    },
    [audioDuration, setAudioCurrentTime]
  );

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${(songTitle ?? "vibe2verse-rap").replace(/\s+/g, "_")}.wav`;
    a.click();
    onDownload?.();
  };

  const progressPercent =
    audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          lastSpokenIndexRef.current = -1;
        }}
        preload="auto"
      />

      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-4 shadow-2xl text-slate-800">
        {/* Header: Title + Voice Rap Toggle */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-900 font-bold text-sm truncate max-w-[200px]">
            🎤 {songTitle ?? "Your Rap Track"}
          </p>

          {/* Voice Rap Synthesizer Toggle */}
          <button
            onClick={toggleVoiceRap}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              voiceRapEnabled
                ? "bg-purple-100 border-purple-300 text-purple-700 shadow-xs"
                : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
            }`}
            title="Toggle spoken AI vocal rap over beat"
          >
            <span>{voiceRapEnabled ? "🎙️ Vocal Rap: ON" : "🎵 Beat Only"}</span>
          </button>
        </div>

        {/* Live Audio Graphic Equalizer Visualizer */}
        <div className="flex items-end justify-center gap-1 h-12 mb-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{
                height: `${isPlaying ? h : 6}px`,
                background: "linear-gradient(180deg, #ec4899, #8b5cf6)",
              }}
              transition={{ ease: "easeOut", duration: 0.08 }}
            />
          ))}
        </div>

        {/* Seek Bar */}
        <div
          className="w-full bg-slate-100 rounded-full h-2.5 cursor-pointer mb-2 relative overflow-hidden group border border-slate-200/50"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full rounded-full relative"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #7c3aed, #ec4899, #f43f5e)",
            }}
          />
        </div>

        {/* Timestamp */}
        <div className="flex justify-between text-xs text-slate-500 mb-3 font-mono">
          <span>{formatTime(audioCurrentTime)}</span>
          <span>{formatTime(audioDuration || 32)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-1">
          {/* Replay */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setAudioCurrentTime(0);
                lastSpokenIndexRef.current = -1;
                setIsPlaying(true);
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-base border border-slate-200 shadow-xs"
            title="Replay from start"
          >
            ↺
          </button>

          {/* Main Play / Pause Button */}
          <motion.button
            onClick={() => setIsPlaying(!isPlaying)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            className="w-14 h-14 flex items-center justify-center rounded-2xl text-white text-2xl font-bold transition-all shadow-lg"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              boxShadow: isPlaying
                ? "0 10px 25px -5px rgba(236, 72, 153, 0.5)"
                : "0 10px 25px -5px rgba(124, 58, 237, 0.4)",
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </motion.button>

          {/* Download Audio */}
          <button
            onClick={handleDownload}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-base border border-slate-200 shadow-xs"
            title="Download track"
          >
            ⬇
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
          <span className="text-slate-500 text-xs">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioVolume}
            onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
            className="flex-1 accent-purple-600 h-1"
          />
          <span className="text-slate-500 text-[10px] w-7 text-right font-medium">
            {Math.round(audioVolume * 100)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
