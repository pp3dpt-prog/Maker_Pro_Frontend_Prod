'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);

  const fontPath = useMemo(() => {
    let path = '/fonts/OpenSans-Bold.ttf';
    switch (valores?.fonte) {
      case 'Bebas': path = '/fonts/BebasNeue-Regular.ttf'; break;
      case 'Playfair': path = '/fonts/PlayfairDisplay-Bold.ttf'; break;
      case 'Eindhoven': path = '/fonts/Eindhoven.ttf'; break;
      case 'BADABB': path = '/fonts/BADABB.ttf'; break;
      default: path = '/fonts/OpenSans-Bold.ttf';
    }
    return path;
  }, [valores?.fonte]);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* TEXTO NOME (FRENTE) */}
      {valores?.nome_pet && (
        <group position={[valores.xPos || 0, valores.yPos || 0, 3.1]}>
          <Center>
            <Text font={fontPath} fontSize={(valores.fontSize || 7)*1.6} color="#1e293b" textAlign="center" anchorX="center" anchorY="middle">
              {String(valores.nome_pet).toUpperCase()}
            </Text>
          </Center>
        </group>
      )}

      {/* TEXTO TELEFONE (VERSO) */}
      {valores?.telefone && (
        <group position={[-(valores.xPosN || 0), valores.yPosN || 0, -0.1]} rotation={[0, Math.PI, 0]}>
          <Center>
            <Text font={fontPath} fontSize={(valores.fontSizeN || 5)*1.6} color="#475569" textAlign="center" anchorX="center" anchorY="middle">
              {String(valores.telefone)}
            </Text>
          </Center>
        </group>
      )}
    </group>
  );
}

export default function STLViewer({ produto, valores = {} }: any) {
  if (!produto?.stl_file_path) return null;

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas shadows camera={{ position: [0, 0, 150], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5} adjustCamera={true}>
            <Center>
              <ModeloSTL url={produto.stl_file_path} valores={valores} />
            </Center>
          </Stage>
        </Suspense>
        <OrbitControls makeDefault enablePan={false} />
      </Canvas>
    </div>
  );
}