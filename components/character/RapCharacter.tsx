"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  useSongStore,
  type CharacterState,
  type ReactionType,
  type OutfitTheme,
} from "@/stores/songStore";

interface CharacterProps {
  state: CharacterState;
  isPlaying: boolean;
  audioAmplitude?: number; // 0-1 from audio analysis
  onPartClick?: (part: "head" | "body" | "feet") => void;
}

export default function RapCharacter({
  state,
  isPlaying,
  audioAmplitude = 0,
  onPartClick,
}: CharacterProps) {
  const { accessories, activeReaction } = useSongStore();

  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);

  // Outfit color paletting
  const outfitColors = useMemo(() => {
    switch (accessories.outfit) {
      case "cyberpunk":
        return { hoodie: "#090924", accent: "#06b6d4", pants: "#111827", cap: "#7c3aed" };
      case "fire":
        return { hoodie: "#7f1d1d", accent: "#f97316", pants: "#1c1917", cap: "#dc2626" };
      case "royal":
        return { hoodie: "#3b0764", accent: "#fbbf24", pants: "#1e1b4b", cap: "#581c87" };
      case "streetwear":
      default:
        return { hoodie: "#18182e", accent: "#ec4899", pants: "#0f172a", cap: "#2563eb" };
    }
  }, [accessories.outfit]);

  // Materials
  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: "#d49b6a", roughness: 0.65 }),
    hoodie: new THREE.MeshStandardMaterial({ color: outfitColors.hoodie, roughness: 0.75 }),
    accent: new THREE.MeshStandardMaterial({ color: outfitColors.accent, roughness: 0.5 }),
    pants: new THREE.MeshStandardMaterial({ color: outfitColors.pants, roughness: 0.85 }),
    sneakers: new THREE.MeshStandardMaterial({ color: "#e11d48", roughness: 0.4, metalness: 0.1 }),
    white: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 }),
    hair: new THREE.MeshStandardMaterial({ color: "#17120e", roughness: 0.9 }),
    eyes: new THREE.MeshStandardMaterial({ color: "#09090b", roughness: 0.1 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: "#ffffff" }),
    chains: new THREE.MeshStandardMaterial({ color: "#eab308", metalness: 0.9, roughness: 0.15 }),
    shades: new THREE.MeshStandardMaterial({ color: "#09090b", metalness: 0.7, roughness: 0.1 }),
    cap: new THREE.MeshStandardMaterial({ color: outfitColors.cap, roughness: 0.7 }),
    headphones: new THREE.MeshStandardMaterial({ color: "#0284c7", metalness: 0.4, roughness: 0.3 }),
    headband: new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.6 }),
  }), [outfitColors]);

  // Animation clock & state timers
  const clockRef = useRef({
    t: 0,
    blinkTimer: 2,
    reactionTime: 0,
    currentReaction: null as ReactionType | null,
  });

  useFrame((_, delta) => {
    const clock = clockRef.current;
    clock.t += delta;
    clock.blinkTimer -= delta;

    const t = clock.t;
    const g = groupRef.current;
    const head = headRef.current;
    const body = bodyRef.current;
    const lArm = leftArmRef.current;
    const rArm = rightArmRef.current;
    const lLeg = leftLegRef.current;
    const rLeg = rightLegRef.current;
    const jaw = jawRef.current;

    if (!g || !head || !body) return;

    // Reset base offsets before applying state animations
    let targetX = 0;
    let targetY = -0.8;
    let targetRotY = 0;

    // ── REACTION OVERRIDES (Talking Tom style pokes) ────────────
    if (activeReaction) {
      clock.reactionTime += delta * 4;
      const rt = clock.reactionTime;

      if (activeReaction === "dizzy") {
        // Head shakes rapidly and wobbles
        head.rotation.y = Math.sin(rt * 12) * 0.45;
        head.rotation.z = Math.cos(rt * 10) * 0.25;
        g.position.y = targetY + Math.sin(rt * 6) * 0.05;
        if (lArm) lArm.rotation.z = -0.6 + Math.sin(rt * 8) * 0.3;
        if (rArm) rArm.rotation.z = 0.6 + Math.sin(rt * 8) * 0.3;
        return;
      }

      if (activeReaction === "chestbump") {
        // Body bounces forward and arms scratch
        const pump = Math.sin(rt * 8);
        body.position.z = Math.max(0, pump * 0.15);
        head.rotation.x = -pump * 0.2;
        if (rArm) {
          rArm.rotation.x = -1.2 + Math.sin(rt * 10) * 0.4;
          rArm.rotation.y = 0.4;
        }
        return;
      }

      if (activeReaction === "moonwalk") {
        // Shuffle slide
        g.position.x = Math.sin(rt * 3) * 0.3;
        if (lLeg) lLeg.rotation.x = Math.sin(rt * 8) * 0.4;
        if (rLeg) rLeg.rotation.x = -Math.sin(rt * 8) * 0.4;
        head.rotation.y = -Math.PI / 6;
        return;
      }

      if (activeReaction === "spin") {
        // Full 360 spin
        g.rotation.y = rt * Math.PI * 1.5;
        g.position.y = targetY + Math.abs(Math.sin(rt * Math.PI)) * 0.3;
        return;
      }
    } else {
      clock.reactionTime = 0;
      g.rotation.y = 0;
      g.position.x = 0;
    }

    // ── STATE-BASED ANIMATIONS ─────────────────────────────────

    // 1. IDLE / CHILLING: breathing, subtle weight shift
    if (state === "idle" || state === "chilling") {
      const breathe = Math.sin(t * 1.4) * 0.015;
      body.scale.y = 1 + breathe;
      body.position.y = breathe * 0.5;
      g.position.y = targetY + Math.sin(t * 0.9) * 0.02;

      head.rotation.y = Math.sin(t * 0.4) * 0.08;
      head.rotation.x = Math.sin(t * 0.3) * 0.04;

      if (lArm) {
        lArm.rotation.z = -0.12 + Math.sin(t * 0.7) * 0.03;
        lArm.rotation.x = Math.sin(t * 0.5) * 0.05;
      }
      if (rArm) {
        rArm.rotation.z = 0.12 - Math.sin(t * 0.7) * 0.03;
        rArm.rotation.x = Math.sin(t * 0.5) * 0.05;
      }
    }

    // 2. LISTENING: leaning forward attentively, head tilted
    if (state === "listening") {
      body.rotation.x = 0.08;
      head.rotation.x = 0.06 + Math.sin(t * 0.8) * 0.03;
      head.rotation.y = Math.sin(t * 0.5) * 0.06;
      head.rotation.z = 0.06;
      g.position.y = targetY;

      if (rArm) {
        rArm.rotation.x = -0.4;
        rArm.rotation.z = 0.2;
      }
    }

    // 3. THINKING: chin scratch, head tilt, pondering
    if (state === "thinking") {
      head.rotation.z = 0.12 + Math.sin(t * 0.6) * 0.04;
      head.rotation.y = Math.sin(t * 0.4) * 0.15;
      head.rotation.x = -0.05;

      if (rArm) {
        rArm.rotation.x = -1.1 + Math.sin(t * 2) * 0.08;
        rArm.rotation.z = -0.3;
      }
      if (lArm) {
        lArm.rotation.z = -0.2;
      }
      g.position.y = targetY + Math.sin(t * 1.2) * 0.01;
    }

    // 4. EXCITED: energetic hopping, arms pumping
    if (state === "excited") {
      const hop = Math.abs(Math.sin(t * 7)) * 0.09;
      g.position.y = targetY + hop;
      head.rotation.y = Math.sin(t * 5) * 0.25;

      if (lArm) lArm.rotation.x = -0.6 + Math.sin(t * 6) * 0.4;
      if (rArm) rArm.rotation.x = -0.6 + Math.sin(t * 6 + Math.PI) * 0.4;
    }

    // 5. PERFORMING: dynamic rap performance + amplitude-driven lip sync
    if (state === "performing") {
      // 92 BPM cadence = ~1.53 beats per second
      const beat = Math.abs(Math.sin(t * Math.PI * 1.53));
      const amp = isPlaying ? (audioAmplitude * 0.7 + 0.3) : 0.4;

      // Heavy bass bounce
      g.position.y = targetY + beat * 0.09 * amp;
      body.rotation.z = Math.sin(t * 3.1) * 0.05;
      body.rotation.x = Math.sin(t * 6.2) * 0.03;

      // Head nodding to rhythm
      head.rotation.x = beat * 0.18 * amp - 0.06;
      head.rotation.y = Math.sin(t * 2.2) * 0.2;

      // Microphone arm (right arm holding mic near mouth)
      if (rArm) {
        rArm.rotation.x = -1.35 + Math.sin(t * 3) * 0.15 * amp;
        rArm.rotation.z = 0.25 + Math.sin(t * 1.5) * 0.1;
      }

      // Gesture arm (left arm throwing hip-hop signs & flow)
      if (lArm) {
        lArm.rotation.x = -0.4 + Math.sin(t * 2.8 + 0.6) * 0.5 * amp;
        lArm.rotation.z = -0.35 + Math.sin(t * 1.8) * 0.25;
      }

      // Leg step rhythm
      if (lLeg) lLeg.rotation.x = Math.sin(t * 3.1) * 0.09;
      if (rLeg) rLeg.rotation.x = Math.sin(t * 3.1 + Math.PI) * 0.09;

      // Real amplitude-driven mouth movement (lip sync)
      if (jaw && isPlaying) {
        const mouthOpen = Math.min(0.12, audioAmplitude * 0.28 + (beat > 0.6 ? 0.04 : 0));
        jaw.position.y = -0.12 - mouthOpen;
        jaw.scale.y = 1 + mouthOpen * 4;
      }
    }

    // 6. ERROR: sad shrug
    if (state === "error") {
      head.rotation.x = 0.2;
      head.rotation.z = 0.08;
      g.position.y = targetY - 0.04;
      if (lArm) lArm.rotation.z = -0.4;
      if (rArm) rArm.rotation.z = 0.4;
    }

    // ── Blinking logic ─────────────────────────────────────────
    if (clock.blinkTimer <= 0) {
      clock.blinkTimer = 2.5 + Math.random() * 3.5;
    }
    const blinkPhase = clock.blinkTimer < 0.12 ? 0.1 : 1;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = blinkPhase;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = blinkPhase;
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* ── Body (Hoodie) ── */}
      <group
        ref={bodyRef}
        onClick={(e) => {
          e.stopPropagation();
          onPartClick?.("body");
        }}
      >
        <mesh material={materials.hoodie} castShadow>
          <cylinderGeometry args={[0.29, 0.33, 0.72, 16]} />
        </mesh>
        {/* Kangaroo pocket */}
        <mesh position={[0, -0.1, 0.3]} material={materials.hoodie}>
          <boxGeometry args={[0.26, 0.16, 0.04]} />
        </mesh>
        {/* Accent stripe */}
        <mesh position={[0, 0.15, 0.29]} material={materials.accent}>
          <boxGeometry args={[0.2, 0.02, 0.02]} />
        </mesh>
        {/* Gold Chain Necklace (optional accessory) */}
        {accessories.goldChain && (
          <group position={[0, 0.12, 0.28]}>
            <mesh material={materials.chains}>
              <torusGeometry args={[0.13, 0.016, 8, 24]} />
            </mesh>
            {/* Medallion pendant */}
            <mesh position={[0, -0.14, 0.02]} material={materials.chains}>
              <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
            </mesh>
          </group>
        )}
      </group>

      {/* ── Head ── */}
      <group
        ref={headRef}
        position={[0, 0.68, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPartClick?.("head");
        }}
      >
        {/* Head base */}
        <mesh material={materials.skin} castShadow>
          <sphereGeometry args={[0.28, 20, 20]} />
        </mesh>

        {/* Cap (rotated slightly sideways for rap swag) */}
        <group rotation={[0.05, 0.15, -0.05]} position={[0, 0.06, 0]}>
          <mesh position={[0, 0.18, -0.02]} material={materials.cap}>
            <cylinderGeometry args={[0.26, 0.28, 0.13, 16]} />
          </mesh>
          <mesh position={[0, 0.13, 0.22]} rotation={[0.25, 0, 0]} material={materials.cap}>
            <boxGeometry args={[0.32, 0.04, 0.22]} />
          </mesh>
          {/* Cap Logo / Pin */}
          <mesh position={[0, 0.18, 0.26]} material={materials.accent}>
            <sphereGeometry args={[0.025, 8, 8]} />
          </mesh>
        </group>

        {/* DJ Headphones (optional accessory) */}
        {accessories.headphones && (
          <group position={[0, 0.08, 0]}>
            {/* Headband arch */}
            <mesh position={[0, 0.2, 0]} material={materials.headband}>
              <torusGeometry args={[0.29, 0.02, 8, 24, Math.PI]} />
            </mesh>
            {/* Left earcup */}
            <mesh position={[-0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.headphones}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
            </mesh>
            {/* Right earcup */}
            <mesh position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.headphones}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
            </mesh>
          </group>
        )}

        {/* Eyes & Sunglasses */}
        {accessories.shades ? (
          /* Sunglasses */
          <group position={[0, 0.04, 0.26]}>
            <mesh material={materials.shades}>
              <boxGeometry args={[0.34, 0.09, 0.04]} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0.02, 0.02]} material={materials.chains}>
              <boxGeometry args={[0.06, 0.015, 0.02]} />
            </mesh>
          </group>
        ) : (
          /* Regular expressive eyes */
          <>
            <group ref={rightEyeRef} position={[0.09, 0.05, 0.24]}>
              <mesh material={materials.eyeWhite}>
                <sphereGeometry args={[0.055, 12, 12]} />
              </mesh>
              <mesh position={[0, 0, 0.035]} material={materials.eyes}>
                <sphereGeometry args={[0.035, 10, 10]} />
              </mesh>
            </group>
            <group ref={leftEyeRef} position={[-0.09, 0.05, 0.24]}>
              <mesh material={materials.eyeWhite}>
                <sphereGeometry args={[0.055, 12, 12]} />
              </mesh>
              <mesh position={[0, 0, 0.035]} material={materials.eyes}>
                <sphereGeometry args={[0.035, 10, 10]} />
              </mesh>
            </group>
            {/* Eyebrows */}
            <mesh position={[0.09, 0.12, 0.26]} rotation={[0, 0, -0.15]} material={materials.hair}>
              <boxGeometry args={[0.09, 0.02, 0.015]} />
            </mesh>
            <mesh position={[-0.09, 0.12, 0.26]} rotation={[0, 0, 0.15]} material={materials.hair}>
              <boxGeometry args={[0.09, 0.02, 0.015]} />
            </mesh>
          </>
        )}

        {/* Nose */}
        <mesh position={[0, -0.02, 0.27]} material={materials.skin}>
          <sphereGeometry args={[0.038, 8, 8]} />
        </mesh>

        {/* Mouth / Jaw for Lip Sync */}
        <mesh position={[0, -0.12, 0.25]} material={materials.skin} ref={jawRef}>
          <boxGeometry args={[0.13, 0.04, 0.02]} />
        </mesh>
        {/* Teeth / Grin */}
        <mesh position={[0, -0.11, 0.255]} material={materials.white}>
          <boxGeometry args={[0.08, 0.015, 0.01]} />
        </mesh>

        {/* Ears */}
        <mesh position={[0.29, 0, 0]} material={materials.skin}>
          <sphereGeometry args={[0.055, 8, 8]} />
        </mesh>
        <mesh position={[-0.29, 0, 0]} material={materials.skin}>
          <sphereGeometry args={[0.055, 8, 8]} />
        </mesh>
        {/* Gold Earring */}
        <mesh position={[0.3, -0.05, 0]} material={materials.chains}>
          <torusGeometry args={[0.02, 0.005, 6, 12]} />
        </mesh>
      </group>

      {/* ── Left Arm (Gestures) ── */}
      <group ref={leftArmRef} position={[-0.37, 0.24, 0]}>
        <mesh material={materials.hoodie} castShadow>
          <capsuleGeometry args={[0.095, 0.36, 4, 10]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.28, 0]} material={materials.skin}>
          <sphereGeometry args={[0.085, 10, 10]} />
        </mesh>
      </group>

      {/* ── Right Arm (Microphone) ── */}
      <group ref={rightArmRef} position={[0.37, 0.24, 0]}>
        <mesh material={materials.hoodie} castShadow>
          <capsuleGeometry args={[0.095, 0.36, 4, 10]} />
        </mesh>
        {/* Hand holding mic */}
        <mesh position={[0, -0.28, 0]} material={materials.skin}>
          <sphereGeometry args={[0.085, 10, 10]} />
        </mesh>
        {/* Microphone */}
        <group position={[0, -0.36, 0.08]} rotation={[0.4, 0, 0]}>
          {/* Mic handle */}
          <mesh material={materials.pants}>
            <cylinderGeometry args={[0.022, 0.018, 0.16, 12]} />
          </mesh>
          {/* Mic grille */}
          <mesh position={[0, 0.1, 0]} material={materials.chains}>
            <sphereGeometry args={[0.038, 12, 12]} />
          </mesh>
        </group>
      </group>

      {/* ── Pants (Hips) ── */}
      <group position={[0, -0.42, 0]}>
        <mesh material={materials.pants} castShadow>
          <cylinderGeometry args={[0.29, 0.27, 0.42, 14]} />
        </mesh>
      </group>

      {/* ── Left Leg & Sneaker ── */}
      <group
        ref={leftLegRef}
        position={[-0.14, -0.75, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPartClick?.("feet");
        }}
      >
        <mesh material={materials.pants} castShadow>
          <capsuleGeometry args={[0.105, 0.36, 4, 10]} />
        </mesh>
        {/* Sneaker */}
        <mesh position={[0, -0.3, 0.06]} material={materials.sneakers}>
          <boxGeometry args={[0.18, 0.11, 0.3]} />
        </mesh>
        {/* White Sneaker Sole */}
        <mesh position={[0, -0.26, 0.06]} material={materials.white}>
          <boxGeometry args={[0.17, 0.035, 0.28]} />
        </mesh>
      </group>

      {/* ── Right Leg & Sneaker ── */}
      <group
        ref={rightLegRef}
        position={[0.14, -0.75, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPartClick?.("feet");
        }}
      >
        <mesh material={materials.pants} castShadow>
          <capsuleGeometry args={[0.105, 0.36, 4, 10]} />
        </mesh>
        {/* Sneaker */}
        <mesh position={[0, -0.3, 0.06]} material={materials.sneakers}>
          <boxGeometry args={[0.18, 0.11, 0.3]} />
        </mesh>
        {/* White Sneaker Sole */}
        <mesh position={[0, -0.26, 0.06]} material={materials.white}>
          <boxGeometry args={[0.17, 0.035, 0.28]} />
        </mesh>
      </group>
    </group>
  );
}
