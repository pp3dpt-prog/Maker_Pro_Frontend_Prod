'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);

  // Mapeamento de fontes para garantir que o preview usa o mesmo estilo que o OpenSCAD
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

  // --- LÓGICA DE EXCLUSÃO INTELIGENTE ---
  // O coração é mais compacto e usa mm reais no server, por isso precisa de menos "ajuda" visual.
  // As outras peças (osso/circulo) mantêm o fator 1.6 que já tinhas calibrado.
  const multiplicadorVisual = valores?.forma === 'coracao' ? 1.0 : 1.6;

  return (
    <group>
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* TEXTO NOME (FRENTE) */}
      {(valores?.nome_pet || valores?.nome) && (
        <group position={[valores.xPos || 0, valores.yPos || 0, 3.1]}>
          <Center>
            <Text 
              font={fontPath} 
              fontSize={(valores.fontSize || 7) * multiplicadorVisual} 
              color="#1e293b" 
              textAlign="center" 
              anchorX="center" 
              anchorY="middle"
            >
              {String(valores.nome_pet || valores.nome).toUpperCase()}
            </Text>
          </Center>
        </group>
      )}

      {/* TEXTO TELEFONE (VERSO) */}
      {valores?.telefone && (
        <group position={[-(valores.xPosN || 0), valores.yPosN || 0, -0.1]} rotation={[0, Math.PI, 0]}>
          <Center>
            <Text 
              font={fontPath} 
              fontSize={(valores.fontSizeN || 5) * multiplicadorVisual} 
              color="#475569" 
              textAlign="center" 
              anchorX="center" 
              anchorY="middle"
            >
              {String(valores.telefone)}
            </Text>
          </Center>
        </group>
      )}
    </group>
  );
}

export default function STLViewer({ produto, valores = {} }: any) {
  // Fallback para garantir que o componente não quebra sem ficheiro
  if (!produto?.stl_file_path) return (
    <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', borderRadius: '8px' }}>
      <p style={{ color: '#94a3b8' }}>Carregando modelo 3D...</p>
    </div>
  );

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