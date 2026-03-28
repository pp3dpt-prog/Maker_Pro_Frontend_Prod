'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text, ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  const geometry = useLoader(STLLoader, url);

  // --- PARAMETRIZAÇÃO DO NOME (FRENTE) ---
  const fontSize = valores?.fontSize || 7;
  const xPos = valores?.xPos || 0;
  const yPos = valores?.yPos || 0;

  // --- PARAMETRIZAÇÃO DO NÚMERO (VERSO) ---
  const fontSizeN = valores?.fontSizeN || 6.5;
  const xPosN = valores?.xPosN || 0;
  const yPosN = valores?.yPosN || 0;

  // Z Fixo para garantir que o texto fica na superfície
  const zFrente = 3.1; 
  const zTras = -0.1;

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
      {/* PEÇA BASE */}
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* TEXTO NOME (FRENTE) */}
      {valores?.nome_pet && (
        <group position={[xPos, yPos, zFrente]}>
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

      {/* TEXTO NÚMERO (VERSO) */}
      {/* Nota: xPosN é invertido (-xPosN) porque a peça está rodada 180º no verso */}
      {valores?.telefone && (
        <group position={[-xPosN, yPosN, zTras]} rotation={[0, Math.PI, 0]}>
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