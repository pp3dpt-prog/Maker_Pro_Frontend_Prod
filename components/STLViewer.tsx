"use client";

import React, { Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Stage, Text } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

// 1. Definimos a interface aqui. Isto diz ao componente exatamente o que ele recebe.
interface STLViewerProps {
  url: string | null;
  name?: string; // O '?' torna a propriedade opcional
  phone?: string; // O '?' torna a propriedade opcional
}

function Model({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial color="#3b82f6" roughness={0.7} metalness={0.0} />
    </mesh>
  );
}

// 2. Agora o componente aceita as props definidas na interface
export default function STLViewer({ url, name, phone }: STLViewerProps) {
  if (!url) return null;

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6} adjustCamera={true}>
            <Model url={url} />
            
            {/* 3. Renderiza o texto passado pelo page.tsx */}
            {name && (
              <Text position={[0, 0, 2.5]} fontSize={0.6} color="white">
                {name}
              </Text>
            )}
            {phone && (
              <Text position={[0, -1, -2]} fontSize={0.4} color="white">
                {phone}
              </Text>
            )}
          </Stage>
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}