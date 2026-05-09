'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { FontLoader } from 'three-stdlib';
import { TextGeometry } from 'three-stdlib';

type Preview3DProps = {
  params: Record<string, any>;
  stlFilePath?: string | null; // /models/blank_osso.stl etc.
};

// Mapa de fontes disponíveis
const FONT_MAP: Record<string, string> = {
  'Aladin':     '/fonts/Aladin.json',
  'Amarante':   '/fonts/Amarante.json',
  'Benne':      '/fonts/Benne.json',
  'Baloo 2':    '/fonts/Baloo2.json',
};

// ── Componente que carrega o STL em branco e sobrepõe texto ──
function PetTagModel({
  stlFilePath,
  params,
  showText,
}: {
  stlFilePath: string;
  params: Record<string, any>;
  showText: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [bodyMesh, setBodyMesh] = useState<THREE.Mesh | null>(null);
  const [frontText, setFrontText] = useState<THREE.Mesh | null>(null);
  const [backText, setBackText] = useState<THREE.Mesh | null>(null);

  // Carregar STL em branco
  useEffect(() => {
    const loader = new STLLoader();
    loader.load(stlFilePath, (geometry: THREE.BufferGeometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      // Centrar geometria
      const box = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -box.min.z);

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: '#93c5fd',
          metalness: 0.1,
          roughness: 0.4,
        })
      );
      setBodyMesh(mesh);
    });
  }, [stlFilePath]);

  // Carregar texto
  useEffect(() => {
    if (!showText) {
      setFrontText(null);
      setBackText(null);
      return;
    }

    const nomePet   = params.nome_pet  || '';
    const telefone  = params.telefone  || '';
    const fonteName = params.fonte     || 'Open Sans';
    const fontSize  = (params.fontSize  || 7) * 0.9;
    const fontSizeN = (params.fontSizeN || 6) * 0.9;
    const xPos  = params.xPos  || 0;
    const yPos  = params.yPos  || 0;
    const xPosN = params.xPosN || 0;
    const yPosN = params.yPosN || 0;

    const fontPath = FONT_MAP[fonteName] || FONT_MAP['Open Sans'];
    const fontLoader = new FontLoader();

    fontLoader.load(fontPath, (font) => {
      // Texto da frente (nome)
      if (nomePet) {
        const geomFront = new TextGeometry(nomePet, {
          font,
          size: fontSize,
          height: 0.8,
          curveSegments: 8,
        });
        geomFront.computeBoundingBox();
        const frontBox = geomFront.boundingBox!;
        const frontWidth = frontBox.max.x - frontBox.min.x;
        const frontHeight = frontBox.max.y - frontBox.min.y;

        geomFront.translate(
          -frontWidth / 2 + xPos,
          -frontHeight / 2 + yPos,
          0
        );

        const meshFront = new THREE.Mesh(
          geomFront,
          new THREE.MeshStandardMaterial({ color: '#1e3a5f', metalness: 0.2, roughness: 0.3 })
        );
        setFrontText(meshFront);
      }

      // Texto do verso (telefone) — espelhado
      if (telefone) {
        const geomBack = new TextGeometry(telefone, {
          font,
          size: fontSizeN,
          height: 0.8,
          curveSegments: 8,
        });
        geomBack.computeBoundingBox();
        const backBox = geomBack.boundingBox!;
        const backWidth = backBox.max.x - backBox.min.x;
        const backHeight = backBox.max.y - backBox.min.y;

        geomBack.translate(
          -backWidth / 2 + xPosN,
          -backHeight / 2 + yPosN,
          0
        );

        const meshBack = new THREE.Mesh(
          geomBack,
          new THREE.MeshStandardMaterial({ color: '#1e3a5f', metalness: 0.2, roughness: 0.3 })
        );
        setBackText(meshBack);
      }
    });
  }, [showText, params]);

  // Calcular altura do STL para posicionar o texto
  const [stlHeight, setStlHeight] = useState(3);
  useEffect(() => {
    if (bodyMesh) {
      const box = new THREE.Box3().setFromObject(bodyMesh);
      setStlHeight(box.max.z);
    }
  }, [bodyMesh]);

  if (!bodyMesh) return null;

  return (
    <group ref={groupRef}>
      {/* Corpo em branco */}
      <primitive object={bodyMesh} />

      {/* Texto frente */}
      {showText && frontText && (
        <primitive
          object={frontText}
          position={[0, 0, stlHeight]}
        />
      )}

      {/* Texto verso (por baixo, espelhado em X) */}
      {showText && backText && (
        <primitive
          object={backText}
          position={[0, 0, -0.8]}
          rotation={[0, Math.PI, 0]}
        />
      )}
    </group>
  );
}

// ── Preview paramétrico simples para caixas ──
function CaixaPreview({ params }: { params: Record<string, any> }) {
  const largura    = typeof params.largura    === 'number' ? params.largura    : 100;
  const comprimento = typeof params.comprimento === 'number' ? params.comprimento : 120;
  const altura     = typeof params.altura     === 'number' ? params.altura     : 60;

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[largura, altura, comprimento]} />
      <meshStandardMaterial color="#2563eb" metalness={0.25} roughness={0.45} />
    </mesh>
  );
}

// ── Componente principal ──
export default function Preview3D({ params, stlFilePath }: Preview3DProps) {
  const isPetTag = !!stlFilePath;
  const [showText, setShowText] = useState(true);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, -80, 60], fov: 45, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050505']} />
          <Environment preset="warehouse" />
          <ambientLight intensity={0.5} />
          <directionalLight position={[50, 50, 80]} intensity={1.2} castShadow />
          <directionalLight position={[-50, -30, 40]} intensity={0.5} />

          <Grid
            args={[500, 500]}
            cellSize={10}
            cellThickness={0.6}
            sectionSize={50}
            sectionThickness={1}
            fadeDistance={300}
            fadeStrength={1}
            sectionColor="#1f2937"
            cellColor="#0b0f14"
          />

          {isPetTag ? (
            <PetTagModel
              stlFilePath={stlFilePath!}
              params={params}
              showText={showText}
            />
          ) : (
            <CaixaPreview params={params} />
          )}

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={20}
            maxDistance={300}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Suspense>
      </Canvas>

      {/* Botão mostrar/esconder texto — só para pet-tags */}
      {isPetTag && (
        <button
          onClick={() => setShowText((v) => !v)}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: showText ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
            color: showText ? '#93c5fd' : '#94a3b8',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {showText ? '👁 Esconder texto' : '👁 Mostrar texto'}
        </button>
      )}
    </div>
  );
}
