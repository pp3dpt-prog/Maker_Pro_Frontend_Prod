'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';

type Props = {
  params: Record<string, any>;
  previewImageUrl: string;
};

// Grelha de reconstrução do relevo no browser — leve o suficiente para
// recalcular a cada alteração de slider (sem pedir nada ao backend), mas com
// resolução suficiente para o furo redondo não ficar demasiado poligonal.
const GRID_LONG = 90;

// ── Réplica de heightFracBeerLambert (Docker: app/image-proc.js) ──
// Mesma física (Beer-Lambert) usada no STL final, para a altura do relevo no
// preview coincidir com a do ficheiro gerado — ver memória do projeto.
function heightFracBeerLambert(luminancia255: number, numCores: number, tdFraction = 0.9): number {
  const n = Math.max(2, numCores);
  const bandHeight = 1 / (n - 1);
  const pos = Math.min(n - 1, Math.max(0, (luminancia255 / 255) * (n - 1)));
  const band = Math.min(n - 2, Math.floor(pos));
  const frac = pos - band;
  const td = tdFraction * bandHeight;
  const maxOpacity = 1 - Math.pow(10, -bandHeight / td);
  const targetOpacity = Math.min(0.999, frac * maxOpacity);
  const t = -td * Math.log10(1 - targetOpacity);
  return band * bandHeight + Math.min(bandHeight, t);
}

// Enquadra a imagem na grelha (cover/contain/fill + zoom + posição), igual ao
// frameImage() do backend (Docker: app/image-proc.js), e devolve a altura 0..1
// de cada célula.
function buildHeightmap(img: HTMLImageElement, opts: {
  cols: number; rows: number;
  fit: string; zoom: number; posX: number; posY: number;
  contraste: number; brilho: number; modoCor: boolean; numCores: number;
}): number[][] {
  const { cols, rows, fit, zoom, posX, posY, contraste, brilho, modoCor, numCores } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const tgtRatio = cols / rows;
  const z = Math.max(0.05, zoom / 100);
  let drawW: number, drawH: number;
  if (fit === 'Esticar') {
    drawW = cols; drawH = rows;
  } else if (fit === 'Ajustar') {
    if (srcRatio > tgtRatio) { drawW = cols; drawH = cols / srcRatio; }
    else { drawH = rows; drawW = rows * srcRatio; }
  } else { // 'Preencher' (cover)
    if (srcRatio > tgtRatio) { drawH = rows; drawW = rows * srcRatio; }
    else { drawW = cols; drawH = cols / srcRatio; }
  }
  drawW *= z; drawH *= z;
  const offX = (cols - drawW) * ((50 + posX) / 100);
  const offY = (rows - drawH) * ((50 + posY) / 100);
  ctx.drawImage(img, offX, offY, drawW, drawH);

  const { data } = ctx.getImageData(0, 0, cols, rows);

  // Luminância + contraste/brilho (aproxima Jimp .contrast()/.brightness())
  const factor = (259 * (contraste * 255 + 255)) / (255 * (259 - contraste * 255));
  const lum = new Float32Array(cols * rows);
  let min = 255, max = 0;
  for (let i = 0; i < cols * rows; i++) {
    const idx = i * 4;
    let v = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    v = factor * (v - 128) + 128 + brilho * 255;
    v = Math.min(255, Math.max(0, v));
    lum[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // Modo P&B: auto-contraste (normalize), tal como o backend em modo_cor=false
  if (!modoCor && max > min) {
    for (let i = 0; i < lum.length; i++) lum[i] = ((lum[i] - min) / (max - min)) * 255;
  }

  const heightmap: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) row.push(heightFracBeerLambert(lum[r * cols + c], numCores));
    heightmap.push(row);
  }
  return heightmap;
}

type BuiltMesh = {
  geometry: THREE.BufferGeometry;
  holeR: number; holeCx: number; holeCy: number; zTop: number;
};

// Réplica de generateBookmarkStl (Docker: app/hueforge-stl.js) — superfície
// superior em relevo, base plana e furo redondo para a argola. A malha aqui
// não precisa de ser estanque (é só visual), por isso o furo fica como um
// recorte na grelha em vez do "colar" de triângulos cosido do gerador real.
function buildGeometry(
  heightmap: number[][], largura: number, altura: number,
  espBase: number, altRelevo: number, holeDiameter: number, holeMarginTop: number
): BuiltMesh {
  const rows = heightmap.length, cols = heightmap[0].length;
  const scaleX = largura / Math.max(1, cols - 1);
  const scaleY = altura / Math.max(1, rows - 1);
  const holeR = holeDiameter / 2;
  const holeCx = largura / 2;
  const holeCy = altura - holeMarginTop;
  const cellDiag = Math.hypot(scaleX, scaleY);
  const clearR = holeR + cellDiag;
  const cleared = (c: number, r: number) => {
    const cx = (c + 0.5) * scaleX, cy = (r + 0.5) * scaleY;
    return (cx - holeCx) ** 2 + (cy - holeCy) ** 2 <= clearR ** 2;
  };
  const h = (r: number, c: number) => espBase + heightmap[rows - 1 - r][c] * altRelevo;

  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (cleared(c, r)) continue;
      const x0 = c * scaleX, y0 = r * scaleY, x1 = (c + 1) * scaleX, y1 = (r + 1) * scaleY;
      const p00 = [x0, y0, h(r, c)], p10 = [x1, y0, h(r, c + 1)];
      const p01 = [x0, y1, h(r + 1, c)], p11 = [x1, y1, h(r + 1, c + 1)];
      tri(p00, p10, p11); tri(p00, p11, p01);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (cleared(c, r)) continue;
      const x0 = c * scaleX, y0 = r * scaleY, x1 = (c + 1) * scaleX, y1 = (r + 1) * scaleY;
      tri([x0, y0, 0], [x1, y1, 0], [x1, y0, 0]);
      tri([x0, y0, 0], [x0, y1, 0], [x1, y1, 0]);
    }
  }
  for (let c = 0; c < cols - 1; c++) {
    const x0 = c * scaleX, x1 = (c + 1) * scaleX;
    tri([x0, 0, 0], [x0, 0, h(0, c)], [x1, 0, h(0, c + 1)]);
    tri([x0, 0, 0], [x1, 0, h(0, c + 1)], [x1, 0, 0]);
    tri([x0, altura, h(rows - 1, c)], [x0, altura, 0], [x1, altura, 0]);
    tri([x0, altura, h(rows - 1, c)], [x1, altura, 0], [x1, altura, h(rows - 1, c + 1)]);
  }
  for (let r = 0; r < rows - 1; r++) {
    const y0 = r * scaleY, y1 = (r + 1) * scaleY;
    tri([0, y0, h(r, 0)], [0, y0, 0], [0, y1, 0]);
    tri([0, y0, h(r, 0)], [0, y1, 0], [0, y1, h(r + 1, 0)]);
    tri([largura, y0, 0], [largura, y0, h(r, cols - 1)], [largura, y1, h(r + 1, cols - 1)]);
    tri([largura, y0, 0], [largura, y1, h(r + 1, cols - 1)], [largura, y1, 0]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  // Centrar em X/Y — a peça é gerada de (0,0) a (largura,altura)
  geometry.translate(-largura / 2, -altura / 2, 0);

  const cc = Math.min(cols - 2, Math.max(0, Math.floor(holeCx / scaleX)));
  const rc = Math.min(rows - 2, Math.max(0, Math.floor(holeCy / scaleY)));
  const zTop = h(rc, cc);

  return { geometry, holeR, holeCx: holeCx - largura / 2, holeCy: holeCy - altura / 2, zTop };
}

function ReliefMesh({ params, previewImageUrl }: Props) {
  const [mesh, setMesh] = useState<BuiltMesh | null>(null);

  const largura   = Number(params?.largura   ?? params?.largura_mm   ?? 55);
  const altura    = Number(params?.altura    ?? params?.altura_mm    ?? 35);
  const espBase   = Number(params?.espessura ?? params?.espessura_base ?? 3.5);
  const altRelevo = Number(params?.relevo    ?? params?.altura_relevo  ?? 1.5);
  const ajuste    = String(params?.img_ajuste ?? 'Preencher');
  const zoom      = Number(params?.img_zoom  ?? 100);
  const posX      = Number(params?.img_pos_x ?? 0);
  const posY      = Number(params?.img_pos_y ?? 0);
  const contraste = Math.max(-1, Math.min(1, Number(params?.contraste ?? 0)));
  const brilho    = Math.max(-1, Math.min(1, Number(params?.brilho ?? 0)));
  const modoCor   = !!params?.modo_cor;
  const numCores  = Math.max(2, Math.min(6, Number(params?.num_cores ?? 4)));

  const depsKey = JSON.stringify({
    previewImageUrl, largura, altura, espBase, altRelevo,
    ajuste, zoom, posX, posY, contraste, brilho, modoCor, numCores,
  });

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const aspect = largura / altura;
      const cols = aspect >= 1 ? GRID_LONG : Math.max(8, Math.round(GRID_LONG * aspect));
      const rows = aspect >= 1 ? Math.max(8, Math.round(GRID_LONG / aspect)) : GRID_LONG;
      const heightmap = buildHeightmap(img, { cols, rows, fit: ajuste, zoom, posX, posY, contraste, brilho, modoCor, numCores });
      // Furo para a argola: 5mm de diâmetro, 4mm de margem ao topo (igual ao backend)
      const built = buildGeometry(heightmap, largura, altura, espBase, altRelevo, 5, 4);
      if (!cancelled) setMesh(built);
    };
    img.src = previewImageUrl;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  if (!mesh) return null;

  return (
    <group>
      <mesh geometry={mesh.geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.08} roughness={0.5} />
      </mesh>
      {/* Túnel do furo — indicativo visual para a argola */}
      <mesh position={[mesh.holeCx, mesh.holeCy, mesh.zTop / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[mesh.holeR, mesh.holeR, mesh.zTop + 0.4, 24, 1, true]} />
        <meshStandardMaterial color="#0f172a" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function PortachavesPreview3D({ params, previewImageUrl }: Props) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, -60, 50], fov: 45, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
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
            cellSize={5}
            cellThickness={0.6}
            sectionSize={25}
            sectionThickness={1}
            fadeDistance={200}
            fadeStrength={1}
            sectionColor="#1f2937"
            cellColor="#0b0f14"
          />
          <ReliefMesh params={params} previewImageUrl={previewImageUrl} />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={20}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
