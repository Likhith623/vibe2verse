import * as fs from "fs";
import * as path from "path";

// ── WAV file generator helper ──────────────────────────────────
function createWavBuffer(
  sampleRate: number,
  samples: Float32Array
): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM = 1)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.floor(intSample), offset);
    offset += 2;
  }

  return buffer;
}

// ── Beat generator function ────────────────────────────────────
function generateHipHopBeat(
  bpm: number,
  durationSec: number,
  style: "boombap" | "trap" | "desi"
): Buffer {
  const sampleRate = 44100;
  const totalSamples = sampleRate * durationSec;
  const output = new Float32Array(totalSamples);

  const secondsPerBeat = 60 / bpm;
  const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);
  const totalBeats = Math.floor(durationSec / secondsPerBeat);

  // Noise table for snare and hi-hats
  const noise = new Float32Array(sampleRate);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.random() * 2 - 1;
  }

  // Generate beat patterns
  for (let beat = 0; beat < totalBeats; beat++) {
    const beatStart = beat * samplesPerBeat;
    const barBeat = beat % 4; // 0, 1, 2, 3

    // ── KICK DRUM: beat 0, beat 2.5, beat 3 in boombap / trap
    const isKick =
      barBeat === 0 ||
      (style === "boombap" && barBeat === 2) ||
      (style === "trap" && (barBeat === 1.5 || barBeat === 3)) ||
      (style === "desi" && (barBeat === 0 || barBeat === 1.5 || barBeat === 2));

    if (isKick) {
      const kickLen = Math.floor(sampleRate * 0.35);
      for (let s = 0; s < kickLen && beatStart + s < totalSamples; s++) {
        const t = s / sampleRate;
        const env = Math.exp(-t * 14);
        const freq = 140 * Math.exp(-t * 30) + 48; // pitch drop
        const kickSample = Math.sin(2 * Math.PI * freq * t) * env;
        // add subtle distortion
        const distorted = Math.tanh(kickSample * 1.6);
        output[beatStart + s] += distorted * 0.65;
      }
    }

    // ── SNARE / CLAP: beat 1 and 3 (2nd and 4th beats of the bar)
    const isSnare = barBeat === 1 || barBeat === 3;
    if (isSnare) {
      const snareLen = Math.floor(sampleRate * 0.25);
      for (let s = 0; s < snareLen && beatStart + s < totalSamples; s++) {
        const t = s / sampleRate;
        const noiseEnv = Math.exp(-t * 22);
        const toneEnv = Math.exp(-t * 35);
        const tone = Math.sin(2 * Math.PI * 185 * t) * toneEnv * 0.4;
        const n = noise[s % noise.length] * noiseEnv * 0.6;
        output[beatStart + s] += (tone + n) * 0.55;
      }
    }

    // ── HI-HATS: 1/8th and 1/16th notes
    const subdivisions = style === "trap" ? 4 : 2;
    for (let sub = 0; sub < subdivisions; sub++) {
      const hatStart = beatStart + Math.floor((sub * samplesPerBeat) / subdivisions);
      const hatLen = Math.floor(sampleRate * 0.05);
      const hatAmp = sub % 2 === 0 ? 0.22 : 0.14;
      for (let s = 0; s < hatLen && hatStart + s < totalSamples; s++) {
        const t = s / sampleRate;
        const env = Math.exp(-t * 70);
        // high frequency noise
        const n = (noise[(s * 3) % noise.length] - noise[(s * 3 + 1) % noise.length]) * env;
        output[hatStart + s] += n * hatAmp;
      }
    }

    // ── BASSLINE (808 / sub bass notes)
    const bassRootNotes = [43.65, 43.65, 38.89, 48.99]; // F1, F1, Eb1, G1
    const currentRoot = bassRootNotes[Math.floor(beat / 4) % bassRootNotes.length];
    const bassLen = Math.floor(samplesPerBeat * 0.85);
    for (let s = 0; s < bassLen && beatStart + s < totalSamples; s++) {
      const t = s / sampleRate;
      const env = Math.min(1, t * 40) * Math.exp(-t * 2.2);
      const sub = Math.sin(2 * Math.PI * currentRoot * t);
      const subHarmonic = Math.sin(2 * Math.PI * currentRoot * 2 * t) * 0.3;
      const bassSample = Math.tanh((sub + subHarmonic) * 1.3) * env * 0.45;
      output[beatStart + s] += bassSample;
    }

    // ── SYNTH HOOK / MELODY (Catchy minor pentatonic plucks)
    const pentatonic = [220, 261.63, 293.66, 329.63, 392.0]; // A3, C4, D4, E4, G4
    const noteIdx = (beat * 2 + (barBeat % 2)) % pentatonic.length;
    const noteFreq = pentatonic[noteIdx];
    const pluckLen = Math.floor(sampleRate * 0.2);
    for (let s = 0; s < pluckLen && beatStart + s < totalSamples; s++) {
      const t = s / sampleRate;
      const env = Math.exp(-t * 12);
      const synth = Math.sin(2 * Math.PI * noteFreq * t) * env;
      output[beatStart + s] += synth * 0.18;
    }
  }

  // Soft limit / normalize
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(output[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0.95) {
    const scale = 0.95 / maxAmp;
    for (let i = 0; i < totalSamples; i++) {
      output[i] *= scale;
    }
  }

  return createWavBuffer(sampleRate, output);
}

// Generate the 3 beats
const outDir = path.join(__dirname, "../public/audio");
fs.mkdirSync(outDir, { recursive: true });

const beats = [
  { name: "beat-comedy.wav", bpm: 95, duration: 32, style: "boombap" as const },
  { name: "beat-trap.wav", bpm: 130, duration: 32, style: "trap" as const },
  { name: "beat-desi.wav", bpm: 98, duration: 32, style: "desi" as const },
];

for (const b of beats) {
  const filePath = path.join(outDir, b.name);
  const buf = generateHipHopBeat(b.bpm, b.duration, b.style);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated: ${filePath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}
