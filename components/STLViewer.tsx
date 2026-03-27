// components/STLViewer.tsx
'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);

  const escala: [number, number, number] = useMemo(() => {
    if (!valores?.largura) return [1, 1, 1];
    return [valores.largura / 100, (valores.profundidade || 100) / 100, (valores.altura || 100) / 100];
  }, [valores]);

  return (
    <group scale={escala}>
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* O texto só aparece se houver dados em valores.nome_pet */}
      {valores?.nome_pet && (
        <Center top position={[0, 0, 2]}>
          <Text fontSize={8} color="#1e293b" maxWidth={50} textAlign="center">
            {valores.nome_pet}
          </Text>
        </Center>
      )}
    </group>
  );
}

// Tornamos as props opcionais (?.) para evitar os erros das imagens
export default function STLViewer({ 
  produto, 
  url, 
  valores = {} 
}: { 
  produto?: any; 
  url?: string; 
  valores?: any; 
}) {
  // Define a URL final priorizando stl_file_path
  const urlFinal = url || produto?.stl_file_path || produto?.modelo_url;

  if (!urlFinal) return <div style={{ color: '#475569' }}>Modelo não configurado</div>;

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas shadows camera={{ position: [0, 0, 200], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5}>
            <Center>
              <ModeloSTL url={urlFinal} valores={valores} />
            </Center>
          </Stage>
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}