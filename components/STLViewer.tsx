'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text, ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);

  // Parametrização dinâmica com os valores que vêm dos Sliders
  const fontSize = valores?.fontSize || 7;
  const yPos = valores?.yPos || 0;
  const xPos = valores?.xPos || 0;
  const fontSizeN = valores?.fontSizeN || 6.5;
  const yPosN = valores?.yPosN || 0;
  const xPosN = valores?.xPosN || 0;
  

  const fontPath = useMemo(() => {
    let path = '/fonts/OpenSans-Bold.ttf';
    switch (valores?.fonte) {
      case 'Bebas': path = '/fonts/BebasNeue-Regular.ttf'; break;
      case 'OpenSans': path = '/fonts/OpenSans-Bold.ttf'; break;
      case 'Playfair': path = '/fonts/PlayfairDisplay-Bold.ttf'; break;
      case 'Eindhoven': path = '/fonts/Eindhoven.ttf'; break;
      case 'BADABB': path = '/fonts/BADABB.ttf'; break;
      case 'Kiddosy': path = '/fonts/KiddosyfreeRegular-nRp40.ttf'; break;
      case 'Strezy': path = '/fonts/StrezyBreakRegular-rg998.ttf'; break;
    }
    return path;
  }, [valores?.fonte]);

  return (
    <group>
      {/* A PEÇA STL */}
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* TEXTO FRENTE (NOME) */}
      {valores?.nome_pet && (
        <group position={[xPos, yPos, 3.1]}>
          <Center>
            <Text
              font={fontPath}
              fontSize={fontSize}
              color="#1e293b"
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              depthOffset={-1}
            >
              {String(valores.nome_pet).toUpperCase()}
            </Text>
          </Center>
        </group>
      )}

      {/* TEXTO VERSO (NÚMERO/TELEFONE) */}
      {valores?.telefone && (
        <group position={[xPosN, yPosN, -0.1]} rotation={[0, Math.PI, 0]}>
          <Center>
            <Text
              font={fontPath}
              fontSize={fontSizeN}
              color="#475569"
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              depthOffset={-1}
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
  const stlUrl = produto?.stl_file_path;

  if (!stlUrl) return null;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <Canvas key={produto.id} shadows camera={{ position: [0, 0, 150], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5} adjustCamera={true}>
            <Center>
              <ModeloSTL url={stlUrl} valores={valores} />
            </Center>
          </Stage>
          <ContactShadows opacity={0.4} scale={150} blur={2.5} far={20} color="#000000" />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} />
      </Canvas>
    </div>
  );
}