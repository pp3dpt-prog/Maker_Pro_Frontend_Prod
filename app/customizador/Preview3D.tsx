'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

type Props = {
  largura: number;
  altura: number;
  comprimento: number;
  espessura: number;
};

function Caixa3D({ largura, altura, comprimento, espessura }: Props) {
  // Converter mm → escala visual razoável
  const scale = 0.01;

  return (
    <mesh>
      <boxGeometry
        args={[
          largura * scale,
          altura * scale,
          comprimento * scale,
          espessura * scale
        ]}
      />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}

export default function Preview3D(props: Props) {
  return (
    <Canvas camera={{ position: [2, 2, 2], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      <Caixa3D {...props} />

      <OrbitControls />
    </Canvas>
  );
}