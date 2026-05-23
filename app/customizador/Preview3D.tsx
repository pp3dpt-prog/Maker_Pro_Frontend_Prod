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
  'Aladin':              '/fonts/Aladin.json',
  'Amarante':            '/fonts/amarante.json',
  'Benne':               '/fonts/benne.json',
  'Baloo 2':             '/fonts/baloo2.json',
  'Anton':               '/fonts/Anton.json',
  'Chewy':               '/fonts/Chewy.json',
  'Gloria Hallelujah':   '/fonts/Gloria_Hallelujah.json',
  'Lobster':             '/fonts/Lobster.json',
  'Luckiest Guy':        '/fonts/Luckiest_Guy.json',
  'Oswald':              '/fonts/Oswald_Bold.json',
  'Pacifico':            '/fonts/Pacifico.json',
  'Press Start 2P':      '/fonts/Press_Start_2P.json',
  'Racing Sans One':     '/fonts/Racing_Sans_One.json',
  'Sigmar One':          '/fonts/Sigmar_One.json',
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

// Aplica twist por vértice — simula linear_extrude(twist=...) do OpenSCAD
function applyTwist(geom: THREE.BufferGeometry, twistDeg: number) {
  if (twistDeg === 0) return;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const zRange = bb.max.z - bb.min.z;
  if (zRange === 0) return;
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z   = pos.getZ(i);
    const t   = (z - bb.min.z) / zRange;          // 0 na base, 1 no topo
    const ang = THREE.MathUtils.degToRad(twistDeg * t);
    const x   = pos.getX(i);
    const y   = pos.getY(i);
    pos.setX(i, x * Math.cos(ang) - y * Math.sin(ang));
    pos.setY(i, x * Math.sin(ang) + y * Math.cos(ang));
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

// ── NameKey: portachaves com letras individuais em 3D ──
function NameKeyPreview({ params }: { params: Record<string, any> }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);

  const fontPath = FONT_MAP[String(params.Font_name || '')] ?? FONT_MAP['Aladin'];

  const depsKey = JSON.stringify({
    t: params.Text, fn: params.Font_name, c: params.center, tw: params.twist,
    lx: params.Loop_x_position, ly: params.Loop_y_position, lc: params.Loop_character,
    ...Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [
        [`letter_${i+1}_space`, params[`letter_${i+1}_space`]],
        [`letter_${i+1}_height`, params[`letter_${i+1}_height`]],
      ]).flat()
    )
  });

  useEffect(() => {
    let cancelled = false;
    const text     = String(params.Text || 'KEY').slice(0, 13);
    const center   = Number(params.center  ?? 30);
    const twist    = Number(params.twist   ?? -5);
    const loopX    = Number(params.Loop_x_position ?? 10);
    const loopY    = Number(params.Loop_y_position  ?? 0);
    const loopChar = String(params.Loop_character || 'o');

    const defSpaces = [0, 10, 8, 9, 9, 8.6, 14, 9.5, 9.7, 9.6, 9.6, 9.4, 9.5, 20];
    const getSpace  = (i: number) => Number(params[`letter_${i}_space`]  ?? defSpaces[i] ?? 9);
    const getHeight = (i: number) => Number(params[`letter_${i}_height`] ?? 6);

    new FontLoader().load(fontPath, (font) => {
      if (cancelled) return;
      const grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.1, roughness: 0.4 });

      // Argola
      const loopGeom = new TextGeometry(loopChar, { font, size: 20, height: 3, curveSegments: 32 });
      loopGeom.rotateZ(-Math.PI / 2);
      const loopMesh = new THREE.Mesh(loopGeom, new THREE.MeshStandardMaterial({ color: '#60a5fa', metalness: 0.2, roughness: 0.3 }));
      loopMesh.position.set(-center - loopX, loopY, 0);
      grp.add(loopMesh);

      // Letras com twist
      for (let i = 0; i < text.length; i++) {
        const h    = getHeight(i + 1);
        const xPos = getSpace(i) * i - center;
        const geom = new TextGeometry(text[i], { font, size: 25, height: h, curveSegments: 32 });
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        geom.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
        applyTwist(geom, twist);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(xPos, 0, 0);
        grp.add(mesh);
      }

      setGroup(grp);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, fontPath]);

  if (!group) return null;
  return <primitive object={group} />;
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
  const isPetTag  = !!stlFilePath;
  const isNameKey = !isPetTag && typeof params.Text === 'string' && typeof params.Font_name === 'string';
  const showText  = params.mostrar_texto !== false;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: isPetTag ? [0, -60, 50] : isNameKey ? [0, -60, 120] : [120, 90, 120],
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
          ) : isNameKey ? (
            <NameKeyPreview params={params} />
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
