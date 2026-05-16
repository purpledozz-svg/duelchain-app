import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function FloatingParticles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [count]);

  const colors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    const palette = [
      [0.71, 0.13, 0.88],
      [0, 0.83, 1],
      [1, 0, 0.43],
      [0, 1, 0.95],
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      cols[i * 3] = c[0];
      cols[i * 3 + 1] = c[1];
      cols[i * 3 + 2] = c[2];
    }
    return cols;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GridPlane() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      (mesh.current.material as THREE.MeshBasicMaterial).opacity =
        0.08 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
      <planeGeometry args={[100, 100, 40, 40]} />
      <meshBasicMaterial
        color="#00D4FF"
        wireframe
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={0.2} />
        <FloatingParticles count={150} />
        <GridPlane />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-primary opacity-80" />
    </div>
  );
}

export const NoiseBackground = AnimatedBackground;
export const ParticlesBackground = AnimatedBackground;
