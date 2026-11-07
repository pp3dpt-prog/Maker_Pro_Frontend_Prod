'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

// Pré-visualização realista de litofânias (plana e curva).
//
// Reconstrói no browser a MESMA geometria do STL (Docker: app/hueforge-stl.js
// + app/image-proc.js): enquadramento da imagem, cinzento + auto-contraste,
// espessura pela curva de luz (litoFracLuz) e moldura. Com a "luz acesa" a cor
// de cada ponto é a luz que atravessa essa espessura (Beer-Lambert), por isso
// o que se vê é o contraste real que a peça vai ter — incluindo os pretos que
// nunca ficam totalmente pretos.

type Props = {
  params: Record<string, any>;
  previewImageUrl: string;
  curva: boolean;
};

const GRID_LONG = 220;          // células no lado maior (só visual)
const K_PLA_BRANCO = 1.2;       // igual a LITO_K_PLA_BRANCO no backend
const LUZ_QUENTE: [number, number, number] = [1.0, 0.9, 0.74];

// ── Réplica de litoFracLuz (Docker: app/image-proc.js) → espessura em mm ──
function espessuraLuz(gray255: number, espMin: number, espMax: number): number {
  const luz = Math.pow(Math.min(255, Math.max(0, gray255)) / 255, 2.2);
  const tMax = Math.exp(-K_PLA_BRANCO * espMin);
  const tMin = Math.exp(-K_PLA_BRANCO * espMax);
  const esp = -Math.log(tMin + luz * (tMax - tMin)) / K_PLA_BRANCO;
  return Math.min(espMax, Math.max(espMin, esp));
}

// Enquadra (cover/contain/fill + zoom + posição, igual ao frameImage do
// backend), passa a cinzento, estica o contraste (normalize) e devolve a
// espessura (mm) de cada célula, linha 0 = topo da imagem.
function mapaEspessura(img: HTMLImageElement, cols: number, rows: number, o: {
  fit: string; zoom: number; posX: number; posY: number; espMin: number; espMax: number;
}): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = cols; canvas.height = rows;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const tgtRatio = cols / rows;
  let drawW: number, drawH: number;
  if (o.fit === 'Esticar') { drawW = cols; drawH = rows; }
  else if (o.fit === 'Ajustar') {
    if (srcRatio > tgtRatio) { drawW = cols; drawH = cols / srcRatio; } else { drawH = rows; drawW = rows * srcRatio; }
  } else {
    if (srcRatio > tgtRatio) { drawH = rows; drawW = rows * srcRatio; } else { drawW = cols; drawH = cols / srcRatio; }
  }
  const z = Math.max(0.05, o.zoom / 100);
  drawW *= z; drawH *= z;
  ctx.drawImage(img, (cols - drawW) * ((50 + o.posX) / 100), (rows - drawH) * ((50 + o.posY) / 100), drawW, drawH);

  const { data } = ctx.getImageData(0, 0, cols, rows);
  const g = new Float32Array(cols * rows);
  let min = 255, max = 0;
  for (let i = 0; i < g.length; i++) {
    const v = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]; // = Jimp greyscale
    g[i] = v; if (v < min) min = v; if (v > max) max = v;
  }
  const out = new Float32Array(cols * rows);
  for (let i = 0; i < g.length; i++) {
    const n = max > min ? ((g[i] - min) / (max - min)) * 255 : g[i];
    out[i] = espessuraLuz(n, o.espMin, o.espMax);
  }
  return out;
}

// Grelha indexada rows×cols a partir de uma função de posição (e cor opcional)
function grelha(rows: number, cols: number, pos: (r: number, c: number) => [number, number, number],
                cor?: (r: number, c: number) => [number, number, number], inverter = false): THREE.BufferGeometry {
  const p = new Float32Array(rows * cols * 3);
  const col = cor ? new Float32Array(rows * cols * 3) : null;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = (r * cols + c) * 3;
    const v = pos(r, c); p[i] = v[0]; p[i + 1] = v[1]; p[i + 2] = v[2];
    if (col && cor) { const k = cor(r, c); col[i] = k[0]; col[i + 1] = k[1]; col[i + 2] = k[2]; }
  }
  const idx: number[] = [];
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    if (inverter) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Faixa entre duas sequências de pontos (paredes/tampas)
function faixa(a: [number, number, number][], b: [number, number, number][]): THREE.BufferGeometry {
  const p: number[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    p.push(...a[i], ...b[i], ...a[i + 1], ...a[i + 1], ...b[i], ...b[i + 1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.computeVertexNormals();
  return geo;
}

type Pecas = { frente: THREE.BufferGeometry; tras: THREE.BufferGeometry; bordas: THREE.BufferGeometry[]; tamanho: number };

function construir(img: HTMLImageElement, params: Record<string, any>, curva: boolean): Pecas {
  const espMin = Number(params?.esp_min ?? 0.6);
  const espMax = Math.max(espMin + 0.1, Number(params?.esp_max ?? 3.0));
  const alturaMm = Number(params?.altura_mm ?? 150);
  const enq = {
    fit: String(params?.img_ajuste ?? 'Preencher'),
    zoom: Number(params?.img_zoom ?? 100),
    posX: Number(params?.img_pos_x ?? 0),
    posY: Number(params?.img_pos_y ?? 0),
    espMin, espMax,
  };
  // Cor da luz transmitida (valores lineares — o three converte para sRGB)
  const tRef = Math.exp(-K_PLA_BRANCO * espMin);
  const luz = (t: number): [number, number, number] => {
    const k = Math.exp(-K_PLA_BRANCO * t) / tRef;
    return [LUZ_QUENTE[0] * k, LUZ_QUENTE[1] * k, LUZ_QUENTE[2] * k];
  };

  if (!curva) {
    // ── Plana: frente lisa (z=0) virada para a câmara, relevo atrás ──
    const largImg = Number(params?.largura_mm ?? 150);
    const aspect = largImg / alturaMm;
    const c0 = aspect >= 1 ? GRID_LONG : Math.max(8, Math.round(GRID_LONG * aspect));
    const r0 = aspect >= 1 ? Math.max(8, Math.round(GRID_LONG / aspect)) : GRID_LONG;
    const mapa = mapaEspessura(img, c0, r0, enq);
    // Moldura por fora com a espessura máxima (igual ao backend)
    const moldura = Math.max(0, Number(params?.moldura_mm ?? 3));
    const cellX = largImg / (c0 - 1), cellY = alturaMm / (r0 - 1);
    const pX = moldura > 0 ? Math.max(1, Math.round(moldura / cellX)) : 0;
    const pY = moldura > 0 ? Math.max(1, Math.round(moldura / cellY)) : 0;
    const cols = c0 + 2 * pX, rows = r0 + 2 * pY;
    const W = (cols - 1) * cellX, H = (rows - 1) * cellY;
    const esp = (r: number, c: number) => {
      const ri = r - pY, ci = c - pX;
      return ri >= 0 && ri < r0 && ci >= 0 && ci < c0 ? mapa[ri * c0 + ci] : espMax;
    };
    const X = (c: number) => c * cellX - W / 2;
    const Y = (r: number) => H / 2 - r * cellY;
    const frente = grelha(rows, cols, (r, c) => [X(c), Y(r), 0], (r, c) => luz(esp(r, c)));
    const tras = grelha(rows, cols, (r, c) => [X(c), Y(r), -esp(r, c)], undefined, true);
    const borda = (pts: [number, number][]) =>
      faixa(pts.map(([r, c]) => [X(c), Y(r), 0]), pts.map(([r, c]) => [X(c), Y(r), -esp(r, c)]));
    const topo = Array.from({ length: cols }, (_, c) => [0, c] as [number, number]);
    const base = Array.from({ length: cols }, (_, c) => [rows - 1, c] as [number, number]);
    const esq = Array.from({ length: rows }, (_, r) => [r, 0] as [number, number]);
    const dir = Array.from({ length: rows }, (_, r) => [r, cols - 1] as [number, number]);
    return { frente, tras, bordas: [borda(topo), borda(base), borda(esq), borda(dir)], tamanho: Math.max(W, H) };
  }

  // ── Curva: exterior liso (lado que se vê), relevo por dentro ──
  const raio = Number(params?.raio ?? 50);
  const angulo = Math.min(360, Number(params?.angulo ?? 270));
  const completo = angulo >= 360;
  const A = (angulo * Math.PI) / 180;
  const arco = raio * A;
  const aspect = arco / alturaMm;
  const cols = aspect >= 1 ? GRID_LONG : Math.max(8, Math.round(GRID_LONG * aspect));
  const rows = aspect >= 1 ? Math.max(8, Math.round(GRID_LONG / aspect)) : GRID_LONG;
  const mapa = mapaEspessura(img, cols, rows, enq);
  // Num cilindro completo acrescenta-se uma coluna que repete a primeira (fecha a costura)
  const nc = completo ? cols + 1 : cols;
  const passo = completo ? A / cols : A / (cols - 1);
  const ang = (c: number) => -A / 2 + c * passo;     // c=0 à esquerda, visto de fora (+z)
  const esp = (r: number, c: number) => mapa[r * cols + (c % cols)];
  const Y = (r: number) => alturaMm / 2 - (r / (rows - 1)) * alturaMm;
  const P = (rad: number, r: number, c: number): [number, number, number] =>
    [rad * Math.sin(ang(c)), Y(r), rad * Math.cos(ang(c))];
  const frente = grelha(rows, nc, (r, c) => P(raio, r, c), (r, c) => luz(esp(r, c)), true);
  const tras = grelha(rows, nc, (r, c) => P(raio - esp(r, c), r, c));
  const tampa = (r: number) => faixa(
    Array.from({ length: nc }, (_, c) => P(raio, r, c)),
    Array.from({ length: nc }, (_, c) => P(raio - esp(r, c), r, c)));
  const bordas = [tampa(0), tampa(rows - 1)];
  if (!completo) {
    const lado = (c: number) => faixa(
      Array.from({ length: rows }, (_, r) => P(raio, r, c)),
      Array.from({ length: rows }, (_, r) => P(raio - esp(r, c), r, c)));
    bordas.push(lado(0), lado(nc - 1));
  }
  return { frente, tras, bordas, tamanho: Math.max(2 * raio, alturaMm) };
}

function Litofania({ params, previewImageUrl, curva, luzAcesa, onTamanho }: Props & { luzAcesa: boolean; onTamanho: (t: number) => void }) {
  const [pecas, setPecas] = useState<Pecas | null>(null);
  const depsKey = JSON.stringify({
    previewImageUrl, curva,
    p: ['largura_mm', 'altura_mm', 'esp_min', 'esp_max', 'moldura_mm', 'raio', 'angulo', 'img_ajuste', 'img_zoom', 'img_pos_x', 'img_pos_y']
      .map(k => params?.[k]),
  });

  useEffect(() => {
    let cancelado = false;
    const img = new Image();
    img.onload = () => {
      if (cancelado) return;
      const p = construir(img, params, curva);
      setPecas(prev => {
        if (prev) { prev.frente.dispose(); prev.tras.dispose(); prev.bordas.forEach(b => b.dispose()); }
        return p;
      });
      onTamanho(p.tamanho);
    };
    img.src = previewImageUrl;
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  if (!pecas) return null;
  const branco = '#f2f0ea';
  return (
    <group>
      <mesh geometry={pecas.frente}>
        {luzAcesa
          ? <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
          : <meshStandardMaterial color={branco} roughness={0.55} side={THREE.DoubleSide} />}
      </mesh>
      <mesh geometry={pecas.tras}>
        {luzAcesa
          ? <meshBasicMaterial color={curva ? '#ffe4b8' : '#3a3125'} toneMapped={false} side={THREE.DoubleSide} />
          : <meshStandardMaterial color={branco} roughness={0.55} side={THREE.DoubleSide} />}
      </mesh>
      {pecas.bordas.map((b, i) => (
        <mesh key={i} geometry={b}>
          {luzAcesa
            ? <meshBasicMaterial color="#5a4a34" side={THREE.DoubleSide} />
            : <meshStandardMaterial color={branco} roughness={0.55} side={THREE.DoubleSide} />}
        </mesh>
      ))}
    </group>
  );
}

export default function LitofaniaPreview3D({ params, previewImageUrl, curva }: Props) {
  const [luzAcesa, setLuzAcesa] = useState(true);
  const [tamanho, setTamanho] = useState(150);
  // Curva: um pouco mais longe e de cima, para se perceber a curvatura
  const dist = useMemo(() => Math.max(60, tamanho * (curva ? 2.0 : 1.45)), [tamanho, curva]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true }} style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera makeDefault position={[0, curva ? dist * 0.35 : 0, dist]} fov={40} near={0.5} far={5000} />
        <Suspense fallback={null}>
          <color attach="background" args={[luzAcesa ? '#07070a' : '#1a1d24']} />
          <ambientLight intensity={luzAcesa ? 0.15 : 0.9} />
          <directionalLight position={[60, 80, 120]} intensity={luzAcesa ? 0.2 : 1.6} />
          <directionalLight position={[-80, -40, -60]} intensity={luzAcesa ? 0 : 0.6} />
          <Litofania params={params} previewImageUrl={previewImageUrl} curva={curva} luzAcesa={luzAcesa} onTamanho={setTamanho} />
          <OrbitControls makeDefault enablePan={false} minDistance={20} maxDistance={dist * 3} />
        </Suspense>
      </Canvas>
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
        {[true, false].map(v => (
          <button key={String(v)} type="button" onClick={() => setLuzAcesa(v)} style={{
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${luzAcesa === v ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
            background: luzAcesa === v ? 'rgba(245,158,11,0.18)' : 'rgba(15,23,42,0.7)',
            color: luzAcesa === v ? '#fbbf24' : '#94a3b8',
          }}>
            {v ? '💡 Luz acesa' : '🌙 Luz apagada'}
          </button>
        ))}
      </div>
    </div>
  );
}
