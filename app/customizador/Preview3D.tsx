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
  const scale = 0.01; // mm → escala visual

  return (
    <mesh position={[0, (altura * scale) / 2, 0]}>
      <boxGeometry
        args={[
          largura * scale,
          altura * scale,
          comprimento * scale,
          espessura * scale,
        ]}
      />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}

export default function Preview3D(props: Props) {
  return (
    <Canvas camera={{ position: [3, 2.2, 3], fov: 45 }}>
      {/* Luz */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 5]} intensity={0.9} />

      {/* Chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial
          color="#020617"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Caixa */}
      <Caixa3D {...props} />

      {/* Controlo da câmara */}
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 - Math.PI / 10}
      />
    </Canvas>
  );
}