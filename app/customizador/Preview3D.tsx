'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader, FontLoader, TextGeometry } from 'three-stdlib';

type Preview3DProps = {
  params: Record<string, any>;
  stlFilePath?: string | null;
};

const FONT_MAP: Record<string, string> = {
  'Aladin':   '/fonts/Aladin.json',
  'Amarante': '/fonts/Amarante.json',
  'Benne':    '/fonts/Benne.json',
  'Baloo 2':  '/fonts/Baloo2.json',
};

// ── Pet Tag: carrega STL em branco e sobrepõe texto em tempo real ──
function PetTagModel({
  stlFilePath,
  params,
  showText,
}: {
  stlFilePath: string;
  params: Record<string, any>;
  showText: boolean;
}) {
  const [bodyMesh,  setBodyMesh]  = useState<THREE.Mesh | null>(null);
  const [frontText, setFrontText] = useState<THREE.Mesh | null>(null);
  const [backText,  setBackText]  = useState<THREE.Mesh | null>(null);
  const [stlHeight, setStlHeight] = useState(3);
  const [stlOffsetY, setStlOffsetY] = useState(0); // offset Y do centro geométrico

  // Carregar STL em branco
  useEffect(() => {
    const loader = new STLLoader();
    loader.load(stlFilePath, (geometry: THREE.BufferGeometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const box = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Guardar offset Y antes de centrar
      // Este valor é a diferença entre a origem OpenSCAD e o centro geométrico
      setStlOffsetY(center.y);
      setStlHeight(box.max.z - box.min.z);

      // Centrar em X e Y, ancorar em Z=0
      geometry.translate(-center.x, -center.y, -box.min.z);

      setBodyMesh(new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: '#93c5fd',
          metalness: 0.1,
          roughness: 0.4,
        })
      ));
    });
  }, [stlFilePath]);

  // Regenerar texto sempre que params mudam
  useEffect(() => {
    if (!showText) {
      setFrontText(null);
      setBackText(null);
      return;
    }

    // Limpar texto anterior enquanto carrega nova fonte
    setFrontText(null);
    setBackText(null);

    let cancelled = false;

    const nomePet   = String(params.nome_pet  ?? '');
    const telefone  = String(params.telefone  ?? '');
    const fonteName = String(params.fonte     ?? 'Aladin');
    const fontSize  = Number(params.fontSize  ?? 7);
    const fontSizeN = Number(params.fontSizeN ?? 6);
    const xPos      = Number(params.xPos  ?? 0);
    const yPos      = Number(params.yPos  ?? 0);
    const xPosN     = Number(params.xPosN ?? 0);
    const yPosN     = Number(params.yPosN ?? 0);

    const fontPath = FONT_MAP[fonteName] ?? FONT_MAP['Aladin'];
    const fontLoader = new FontLoader();

    fontLoader.load(
      fontPath,
      (font) => {
        if (cancelled) return;

        // Texto frente (nome)
        if (nomePet) {
          const geomFront = new TextGeometry(nomePet, {
            font,
            size: fontSize,
            height: 0.8,
            curveSegments: 8,
          });
          geomFront.computeBoundingBox();
          const fb = geomFront.boundingBox!;
          const fw = fb.max.x - fb.min.x;
          const fh = fb.max.y - fb.min.y;

          // Compensar offset Y do STL para que yPos=0 corresponda
          // ao mesmo ponto que no OpenSCAD
          geomFront.translate(
            -fw / 2 + xPos,
            -fh / 2 + yPos - stlOffsetY,
            0
          );

          setFrontText(new THREE.Mesh(
            geomFront,
            new THREE.MeshStandardMaterial({
              color: '#1e3a5f',
              metalness: 0.2,
              roughness: 0.3,
            })
          ));
        } else {
          setFrontText(null);
        }

        // Texto verso (telefone)
        if (telefone) {
          const geomBack = new TextGeometry(telefone, {
            font,
            size: fontSizeN,
            height: 0.8,
            curveSegments: 8,
          });
          geomBack.computeBoundingBox();
          const bb = geomBack.boundingBox!;
          const bw = bb.max.x - bb.min.x;
          const bh = bb.max.y - bb.min.y;

          geomBack.translate(
            -bw / 2 + xPosN,
            -bh / 2 + yPosN - stlOffsetY,
            0
          );

          setBackText(new THREE.Mesh(
            geomBack,
            new THREE.MeshStandardMaterial({
              color: '#1e3a5f',
              metalness: 0.2,
              roughness: 0.3,
            })
          ));
        } else {
          setBackText(null);
        }
      },
      undefined,
      (err) => {
        console.error('Erro ao carregar fonte:', fontPath, err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    showText,
    stlOffsetY, // ← importante: regenerar texto quando o offset mudar
    params.nome_pet,
    params.telefone,
    params.fonte,
    params.fontSize,
    params.fontSizeN,
    params.xPos,
    params.yPos,
    params.xPosN,
    params.yPosN,
  ]);

  if (!bodyMesh) return null;

  return (
    <group>
      {/* Corpo em branco */}
      <primitive object={bodyMesh} />

      {/* Texto frente — acima da superfície */}
      {showText && frontText && (
        <primitive object={frontText} position={[0, 0, stlHeight]} />
      )}

      {/* Texto verso — espelhado, abaixo de Z=0 */}
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

// ── Caixa paramétrica simples ──
function CaixaPreview({ params }: { params: Record<string, any> }) {
  const largura     = typeof params.largura     === 'number' ? params.largura     : 100;
  const comprimento = typeof params.comprimento === 'number' ? params.comprimento : 120;
  const altura      = typeof params.altura      === 'number' ? params.altura      : 60;

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
  const showText = params.mostrar_texto !== false;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: isPetTag ? [0, -60, 50] : [120, 90, 120],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050505']} />
          <Environment preset="warehouse" />

          <ambientLight intensity={0.5} />
          <directionalLight position={[50, 50, 80]}   intensity={1.2} castShadow />
          <directionalLight position={[-50, -30, 40]} intensity={0.5} />

          <Grid
            args={[500, 500]}
            cellSize={isPetTag ? 5 : 20}
            cellThickness={0.6}
            sectionSize={isPetTag ? 25 : 100}
            sectionThickness={1}
            fadeDistance={isPetTag ? 200 : 600}
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
            minDistance={isPetTag ? 20 : 80}
            maxDistance={isPetTag ? 200 : 400}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
