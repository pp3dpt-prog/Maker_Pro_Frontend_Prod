'use client';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);
  const fontPath = useMemo(() => {
    switch (valores?.fonte) {
      case 'Bebas': return '/fonts/BebasNeue-Regular.ttf';
      case 'Playfair': return '/fonts/PlayfairDisplay-Bold.ttf';
      case 'BADABB': return '/fonts/BADABB.ttf';
      default: return '/fonts/OpenSans-Bold.ttf';
    }
  }, [valores?.fonte]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.4} />
      </mesh>
      {(valores?.nome_pet || valores?.nome) && (
        <group position={[valores.xPos || 0, valores.yPos || 0, 3.1]}>
          <Center><Text font={fontPath} fontSize={(valores.fontSize || 7) * 1.5} color="#1e293b">{String(valores.nome_pet || valores.nome).toUpperCase()}</Text></Center>
        </group>
      )}
    </group>
  );
}

export default function STLViewer({ produto, valores }: any) {
  if (!produto?.stl_file_path) return null;
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas camera={{ position: [0, 0, 150] }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5}><ModeloSTL url={produto.stl_file_path} valores={valores} /></Stage>
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  );
}