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

  const mult = 1.5;

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.4} />
      </mesh>
      
      {/* NOME NA FRENTE */}
      {(valores?.nome_pet || valores?.nome) && (
        <group position={[valores.xPos || 0, valores.yPos || 0, 3.1]}>
          <Center>
            <Text font={fontPath} fontSize={(valores.fontSize || 7) * mult} color="#1e293b">
                {String(valores.nome_pet || valores.nome).toUpperCase()}
            </Text>
          </Center>
        </group>
      )}

      {/* TELEFONE NO VERSO RECUPERADO */}
      {valores?.telefone && (
        <group position={[-(valores.xPosN || 0), valores.yPosN || 0, -0.1]} rotation={[0, Math.PI, 0]}>
          <Center>
            <Text font={fontPath} fontSize={(valores.fontSizeN || 5) * mult} color="#475569">
                {String(valores.telefone)}
            </Text>
          </Center>
        </group>
      )}
    </group>
  );
}

export default function STLViewer({ produto, valores }: any) {
  if (!produto?.stl_file_path) return (
     <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', borderRadius: '8px' }}>
      <p style={{ color: '#94a3b8' }}>Carregando modelo 3D...</p>
    </div>
  );
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas shadows camera={{ position: [0, 0, 150], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5}>
            <Center>
                <ModeloSTL url={produto.stl_file_path} valores={valores} />
            </Center>
          </Stage>
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}