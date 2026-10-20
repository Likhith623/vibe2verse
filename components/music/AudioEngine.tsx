"use client";

import { useRef, useEffect, useCallback } from "react";
import { useSongStore } from "@/stores/songStore";

// ── Audio analyzer for amplitude-driven lip sync ───────────────
export function useAudioAnalyzer(audioUrl: string | null) {
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const amplitudeRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataRef = useRef<any>(new Uint8Array(64));

  const setup = useCallback(
    (audioEl: HTMLAudioElement) => {
      if (!audioUrl || sourceRef.current) return;

      const ctx = new AudioContext();
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 128;
      analyzer.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioEl);
      source.connect(analyzer);
      analyzer.connect(ctx.destination);

      contextRef.current = ctx;
      analyzerRef.current = analyzer;
      sourceRef.current = source;
      dataRef.current = new Uint8Array(analyzer.frequencyBinCount);
    },
    [audioUrl]
  );

  const getAmplitude = useCallback((): number => {
    if (!analyzerRef.current) return 0;
    const data = dataRef.current;
    analyzerRef.current.getByteFrequencyData(data);
    const sum = (data as Uint8Array).slice(0, 16).reduce((a: number, b: number) => a + b, 0);
    const avg = sum / 16 / 255;
    amplitudeRef.current = avg;
    return avg;
  }, []);

  useEffect(() => {
    return () => {
      contextRef.current?.close();
    };
  }, []);

  return { setup, getAmplitude };
}

// ── Full audio player component ────────────────────────────────
interface AudioPlayerProps {
  audioUrl: string;
  onAmplitude?: (v: number) => void;
}

export function AudioPlayer({ audioUrl, onAmplitude }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    isPlaying,
    audioVolume,
    audioCurrentTime,
    setIsPlaying,
    setAudioCurrentTime,
    setAudioDuration,
    setAudioVolume,
  } = useSongStore();
  const { setup, getAmplitude } = useAudioAnalyzer(audioUrl);
  const rafRef = useRef<number | undefined>(undefined);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Amplitude loop
  useEffect(() => {
    const tick = () => {
      const amp = getAmplitude();
      onAmplitude?.(amp);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, getAmplitude, onAmplitude]);

  return (
    <audio
      ref={audioRef}
      src={audioUrl}
      onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
      onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
      onEnded={() => setIsPlaying(false)}
      onPlay={() => {
        setup(audioRef.current!);
      }}
      preload="metadata"
    />
  );
}
