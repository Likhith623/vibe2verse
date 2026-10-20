"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";
import RapCharacter from "./RapCharacter";
import { useSongStore, type CharacterState } from "@/stores/songStore";

// ── Camera Controller for dynamic presets ──────────────────────
function CameraController() {
  const { camera } = useThree();
  const { cameraPreset } = useSongStore();
  const targetPos = useRef(new THREE.Vector3(0, 0.4, 4));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (cameraPreset === "orbit") return;

    if (cameraPreset === "closeup") {
      targetPos.current.set(0, 0.65, 1.8);
      targetLook.current.set(0, 0.55, 0);
    } else if (cameraPreset === "side") {
      targetPos.current.set(2.2, 0.3, 3.2);
      targetLook.current.set(0, 0, 0);
    } else {
      // Stage view
      targetPos.current.set(0, 0.4, 4);
      targetLook.current.set(0, 0, 0);
    }

    camera.position.lerp(targetPos.current, delta * 3);
    camera.lookAt(targetLook.current);
  });

  return null;
}

// ── Bright modern studio environment ───────────────────────────
function StudioRoom({ audioAmplitude = 0 }: { audioAmplitude?: number }) {
  return (
    <group>
      {/* Light modern floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Warm birch wood floor inlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.59, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#f1ede6" roughness={0.5} />
      </mesh>

      {/* Back acoustic studio wall */}
      <mesh position={[0, 1.2, -4]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Left studio wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-5.5, 1.2, 0]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
      </mesh>

      {/* Right studio wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[5.5, 1.2, 0]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
      </mesh>

      {/* ── Vibrant LED Neon Strips on back wall ── */}
      <NeonStrip position={[-2.4, 0.6, -3.9]} color="#7c3aed" />
      <NeonStrip position={[2.4, 0.6, -3.9]} color="#ec4899" />
      <NeonStrip position={[0, 2.4, -3.9]} color="#06b6d4" />

      {/* ── Producer Desk (left) ── */}
      <Desk position={[-3.6, -0.8, -2.5]} />

      {/* ── Audio Monitor Speakers with Bass Thump ── */}
      <Speaker position={[-2.2, -0.5, -3]} amplitude={audioAmplitude} />
      <Speaker position={[2.2, -0.5, -3]} scale={[-1, 1, 1]} amplitude={audioAmplitude} />

      {/* ── Designer Lounge Sofa (right) ── */}
      <Sofa position={[3.6, -0.9, -2.5]} />

      {/* ── Vinyl records on back wall ── */}
      <VinylDecor position={[-1.2, 1.4, -3.95]} rotation={[0, 0, 0.2]} />
      <VinylDecor position={[1.4, 0.9, -3.95]} rotation={[0, 0, -0.15]} />

      {/* ── Stage Ring under character ── */}
      <StageRing amplitude={audioAmplitude} />
    </group>
  );
}

function NeonStrip({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.04, 2.2, 0.04]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        toneMapped={false}
      />
    </mesh>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desktop in warm birch */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 0.7]} />
        <meshStandardMaterial color="#e8dfd3" roughness={0.6} />
      </mesh>
      {/* Sleek white metal legs */}
      {[[-0.65, -0.3, 0.3], [0.65, -0.3, 0.3], [-0.65, -0.3, -0.3], [0.65, -0.3, -0.3]].map(
        ([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        )
      )}
      {/* Studio Screen */}
      <mesh position={[0, 0.35, -0.2]} castShadow>
        <boxGeometry args={[0.7, 0.45, 0.03]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.35, -0.19]}>
        <planeGeometry args={[0.64, 0.4]} />
        <meshStandardMaterial
          color="#f3e8ff"
          emissive="#c084fc"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

function Speaker({
  position,
  scale,
  amplitude = 0,
}: {
  position: [number, number, number];
  scale?: [number, number, number];
  amplitude?: number;
}) {
  const wooferRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (wooferRef.current) {
      const thump = 1 + amplitude * 0.35;
      wooferRef.current.scale.set(thump, thump, 1 + amplitude * 0.5);
    }
  });

  return (
    <group position={position} scale={scale ?? [1, 1, 1]}>
      {/* Cabinet in sleek clean dark slate */}
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.78, 0.36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      {/* Woofer (animates with bass) */}
      <mesh ref={wooferRef} position={[0, 0.1, 0.18]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Tweeter */}
      <mesh position={[0, -0.2, 0.18]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
}

function Sofa({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Seat in light pastel lavender/cream */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.3, 0.22, 0.65]} />
        <meshStandardMaterial color="#ede9fe" roughness={0.8} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.3, -0.3]} castShadow>
        <boxGeometry args={[1.3, 0.55, 0.16]} />
        <meshStandardMaterial color="#ede9fe" roughness={0.8} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.62, 0.16, 0]} castShadow>
        <boxGeometry args={[0.13, 0.32, 0.65]} />
        <meshStandardMaterial color="#ddd6fe" roughness={0.8} />
      </mesh>
      <mesh position={[0.62, 0.16, 0]} castShadow>
        <boxGeometry args={[0.13, 0.32, 0.65]} />
        <meshStandardMaterial color="#ddd6fe" roughness={0.8} />
      </mesh>
    </group>
  );
}

function VinylDecor({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
        <meshStandardMaterial color="#ec4899" roughness={0.4} />
      </mesh>
    </group>
  );
}

function StageRing({ amplitude = 0 }: { amplitude?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(t * 2) * 0.4 + amplitude * 2.5;
    }
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.58, 0]}>
      <torusGeometry args={[0.85, 0.04, 8, 48]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#7c3aed"
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── Particle system ────────────────────────────────────────────
function MusicParticles({ active, amplitude = 0 }: { active: boolean; amplitude?: number }) {
  const count = 75;
  const particlesRef = useRef<THREE.Points>(null);
  const posArray = useRef(
    new Float32Array(
      Array.from({ length: count * 3 }, () => (Math.random() - 0.5) * 4.5)
    )
  );

  useFrame(({ clock }) => {
    if (!particlesRef.current || !active) return;
    const t = clock.getElapsedTime();
    const pos = posArray.current;
    const speed = 0.005 + amplitude * 0.015;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3 + 1] += speed;
      if (pos[i3 + 1] > 3) pos[i3 + 1] = -1.2;
      pos[i3] += Math.sin(t + i) * 0.003;
    }
    (particlesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[posArray.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#ec4899"
        transparent
        opacity={0.7}
      />
    </points>
  );
}

// ── Lights for Light Mode Studio ───────────────────────────────
function DynamicLights({
  state,
  amplitude = 0,
}: {
  state: CharacterState;
  amplitude?: number;
}) {
  const spotRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    if (!spotRef.current) return;
    const t = clock.getElapsedTime();
    if (state === "performing") {
      spotRef.current.intensity = 3 + Math.sin(t * 3) * 0.8 + amplitude * 3;
      spotRef.current.color.setHSL((Math.sin(t * 0.4) + 1) / 2, 0.7, 0.65);
    } else {
      spotRef.current.intensity = 2.5;
      spotRef.current.color.set("#a855f7");
    }
  });

  return (
    <>
      {/* Clean daylight ambient */}
      <ambientLight intensity={0.8} color="#ffffff" />
      {/* Soft studio fill light */}
      <directionalLight position={[4, 5, 3]} intensity={1.2} color="#fffbeb" castShadow shadow-mapSize={[1024, 1024]} />
      {/* Rim light left & right */}
      <pointLight position={[-3, 2, -2]} intensity={1.5} color="#c084fc" />
      <pointLight position={[3, 2, -2]} intensity={1.5} color="#f472b6" />
      {/* Accent spotlight */}
      <spotLight
        ref={spotRef}
        position={[0, 4.2, 1.2]}
        angle={0.45}
        penumbra={0.6}
        intensity={2.5}
        color="#a855f7"
        target-position={[0, 0, 0]}
      />
      <pointLight position={[0, -1, 1.2]} intensity={0.6 + amplitude} color="#38bdf8" />
    </>
  );
}

// ── Main Scene export ──────────────────────────────────────────
interface SceneProps {
  characterState: CharacterState;
  isPlaying: boolean;
  audioAmplitude?: number;
  onPartClick?: (part: "head" | "body" | "feet") => void;
}

export default function Scene({
  characterState,
  isPlaying,
  audioAmplitude = 0,
  onPartClick,
}: SceneProps) {
  const { cameraPreset } = useSongStore();
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.4, 4], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: "#f8fafc" }}
    >
      <CameraController />
      <DynamicLights state={characterState} amplitude={audioAmplitude} />

      <Suspense fallback={null}>
        <StudioRoom audioAmplitude={audioAmplitude} />

        {/* Character with click zones */}
        <Float
          speed={prefersReducedMotion ? 0 : 1}
          rotationIntensity={prefersReducedMotion ? 0 : 0.05}
          floatIntensity={prefersReducedMotion ? 0 : 0.2}
        >
          <RapCharacter
            state={characterState}
            isPlaying={isPlaying}
            audioAmplitude={audioAmplitude}
            onPartClick={onPartClick}
          />
        </Float>

        <MusicParticles
          active={characterState === "performing" && isPlaying}
          amplitude={audioAmplitude}
        />
        <ContactShadows
          position={[0, -1.6, 0]}
          opacity={0.3}
          scale={4.5}
          blur={2.5}
          far={2}
          color="#64748b"
        />
        <Environment preset="city" />
      </Suspense>

      {!prefersReducedMotion && cameraPreset === "orbit" && (
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={6.5}
          target={[0, 0, 0]}
        />
      )}
    </Canvas>
  );
}
