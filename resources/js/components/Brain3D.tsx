import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ────────────────────────────────────────────
   Procedural brain-like mesh
   Uses IcosahedronGeometry with vertex noise
   to emulate sulci/gyri folds
   ──────────────────────────────────────────── */
function BrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.25, 6);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    // Simple 3D noise-like displacement for brain wrinkles
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      // Create asymmetric folds – looks more organic
      const fold =
        Math.sin(n.x * 8 + n.y * 3) * 0.06 +
        Math.sin(n.y * 10 + n.z * 5) * 0.05 +
        Math.sin(n.z * 7 + n.x * 6) * 0.04 +
        Math.cos(n.x * 12 + n.z * 8) * 0.03;

      // Flatten slightly on bottom (brain stem area)
      const yFlatten = n.y < -0.5 ? 0.85 : 1;
      // Slightly wider than tall
      const scale = (1 + fold) * yFlatten;

      pos.setXYZ(i, n.x * 1.25 * scale * 1.08, n.y * 1.25 * scale * 0.92, n.z * 1.25 * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.12;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0.1, 0]}>
      <meshPhysicalMaterial
        color="#f4a0b5"
        roughness={0.35}
        metalness={0.05}
        clearcoat={0.6}
        clearcoatRoughness={0.2}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────
   Thin orbit ring (torus)
   ──────────────────────────────────────────── */
function OrbitRing({ rotation }: { rotation: [number, number, number] }) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[2.1, 0.012, 16, 120]} />
      <meshBasicMaterial color="#67e8f9" transparent opacity={0.45} />
    </mesh>
  );
}

/* ────────────────────────────────────────────
   Glowing particle orbiting along a ring
   ──────────────────────────────────────────── */
function OrbitingParticle({
  speed = 1,
  rotation = [0, 0, 0] as [number, number, number],
  offset = 0,
  color = '#22d3ee',
}: {
  speed?: number;
  rotation?: [number, number, number];
  offset?: number;
  color?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const particleRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const radius = 2.1;

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    if (particleRef.current) {
      particleRef.current.position.set(x, 0, z);
    }
    if (glowRef.current) {
      glowRef.current.position.set(x, 0, z);
      // Pulsing glow
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3 + offset) * 0.2;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} rotation={rotation}>
      {/* Core particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────
   Ambient floating particles (tiny dots)
   ──────────────────────────────────────────── */
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const count = 60;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 1.8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = 0.5 + Math.random() * 1.5;
    }
    return [pos, sz];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.04;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a5f3fc"
        size={0.03}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

/* ────────────────────────────────────────────
   Main Brain3D Scene
   ──────────────────────────────────────────── */
function BrainScene() {
  const orbitAngles: [number, number, number][] = [
    [Math.PI / 2.5, 0, 0],
    [Math.PI / 2.5, 0, (Math.PI * 2) / 3],
    [Math.PI / 2.5, 0, -(Math.PI * 2) / 3],
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#e0c3fc" />
      <pointLight position={[0, -3, 2]} intensity={0.3} color="#67e8f9" />

      {/* Brain */}
      <BrainMesh />

      {/* Orbit rings */}
      {orbitAngles.map((rot, i) => (
        <OrbitRing key={`ring-${i}`} rotation={rot} />
      ))}

      {/* Orbiting particles */}
      <OrbitingParticle rotation={orbitAngles[0]} speed={0.7} offset={0} color="#22d3ee" />
      <OrbitingParticle rotation={orbitAngles[1]} speed={0.55} offset={2} color="#a78bfa" />
      <OrbitingParticle rotation={orbitAngles[2]} speed={0.65} offset={4} color="#34d399" />

      {/* Ambient particles */}
      <FloatingParticles />
    </>
  );
}

/* ────────────────────────────────────────────
   Exported component – drop-in replacement
   ──────────────────────────────────────────── */
export default function Brain3D({ className = 'w-72 h-72' }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.2, 4.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <BrainScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
