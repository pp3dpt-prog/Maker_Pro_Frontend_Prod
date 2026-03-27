'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage, Text, ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Suspense } from 'react';
import * as THREE from 'three';

function ModeloSTL({ url, valores }: { url: string, valores: any }) {
  // O useLoader só corre se a url for válida
  const geometry = useLoader(STLLoader, url);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        {/* Material branco com brilho suave para parecer real */}
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* O texto "Final" só aparece se o utilizador escrever algo */}
      {valores?.nome_pet && (
        <Center position={[0, 0, 2]}> 
          <Text
            fontSize={6}
            color="#334155" // Cor de "gravação"
            textAlign="center"
          >
            {valores.nome_pet}
          </Text>
        </Center>
      )}
    </group>
  );
}

export default function STLViewer({ url, valores }: { url: string, valores: any }) {
  // Validação do caminho do ficheiro
  if (!url || url.trim() === "") return <div style={{color: 'white'}}>URL inválida</div>;

  return (
    <div style={{ width: '100%', height: '500px', background: '#020617' }}>
      <Canvas shadows camera={{ position: [0, 0, 150], fov: 50 }}>
        <ambientLight intensity={1} />
        <pointLight position={[10, 10, 10]} />
        
        <Suspense fallback={<Text color="white" position={[0,0,0]}>A carregar modelo...</Text>}>
          <Stage environment="city" intensity={0.5}>
            <Center>
              <ModeloSTL url={url} valores={valores} />
            </Center>
          </Stage>
          <ContactShadows position={[0, -40, 0]} opacity={0.4} scale={20} blur={2} />
        </Suspense>
        
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}