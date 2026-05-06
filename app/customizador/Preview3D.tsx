'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense } from 'react';

type Preview3DProps = {
  params: Record<string, any>;
};

/**
 * Preview paramétrico simples
 * Serve APENAS como visualização rápida de aproximação geométrica.
 */
export default function Preview3D({
  params,
}: Preview3DProps) {
  // Extrair parâmetros conhecidos com defaults
  const largura = typeof params.largura === 'number' ? params.largura : 100;
  const comprimento = typeof params.comprimento === 'number' ? params.comprimento : 120;
  const altura = typeof params.altura === 'number' ? params.altura : 60;
  const espessura = typeof params.espessura === 'number' ? params.espessura : 3;

  return (
    <Canvas
      camera={{
        position: [120, 90, 120],
        fov: 45,
        near: 1,
        far: 1000,
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        preserveDrawingBuffer: false,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        {/* Ambiente */}
        <color attach="background" args={['#050505']} />
        <Environment preset="warehouse" />

        {/* Iluminação */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[200, 200, 100]}
          intensity={1}
          castShadow
        />
        <directionalLight
          position={[-200, 100, -100]}
          intensity={0.6}
        />

        {/* Grelha */}
        <Grid
          args={[1000, 1000]}
          cellSize={20}
          cellThickness={0.8}
          sectionSize={100}
          sectionThickness={1.2}
          fadeDistance={600}
          fadeStrength={1}
          sectionColor="#1f2937"
          cellColor="#0b0f14"
        />

        {/* Objeto */}
        <CaixaPreview
          largura={largura}
          comprimento={comprimento}
          altura={altura}
          espessura={espessura}
        />

        {/* Controlo de câmara */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={80}
          maxDistance={400}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Suspense>
    </Canvas>
  );
}

/* -------------------------------
   OBJETO PARAMÉTRICO
-------------------------------- */

function CaixaPreview({
  largura,
  comprimento,
  altura,
  espessura,
}: {
  largura: number;
  comprimento: number;
  altura: number;
  espessura: number;
}) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry
        args={[
          largura,
          altura,
          comprimento,
        ]}
      />
      <meshStandardMaterial
        color="#2563eb"
        metalness={0.25}
        roughness={0.45}
      />
    </mesh>
  );
}