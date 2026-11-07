'use client';

// Pré-visualização do kit de Termoformagem/Prensagem (macho + fêmea + moldura)
// a partir de um SVG/imagem carregado pelo cliente.
//
// A silhueta vem do MESMO motor de vetorização do porta-chaves de imagem
// (potrace/Resvg — só corre no servidor, por isso /api/vetorizar), mas a
// geometria do molde (cone/arredondamento do macho, cavidade com folga
// constante, furos de ventilação) é feita aqui com lib/termoformagem.js —
// o MESMO ficheiro que gera o STL final no backend (Maker_Pro_Docker_Prod/
// app/termoformagem.js) — por isso a pré-visualização é exatamente o que sai.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/termoformagem.js)
import { gerarTermoformagem } from '@/lib/termoformagem';

type Vetor = {
  w: number; h: number;
  silhueta: number[][];
  ancoras: Record<string, [number, number]> | null;
} | null;

type Peca = 'macho' | 'femea' | 'moldura';

type Props = {
  params: Record<string, any>;
  imagePath: string | null; // params.image_path, já carregado (uploads/...)
};

function Modelo({ which, vetor, params, onTamanho }: {
  which: Peca; vetor: Vetor; params: Record<string, any>;
  onTamanho: (raio: number, centroY: number) => void;
}) {
  const geo = useMemo(() => {
    if (!vetor) return null;
    try {
      const r = gerarTermoformagem(vetor, params, { final: false });
      const tris = which === 'macho' ? r.macho : which === 'femea' ? r.femea : r.moldura;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
      g.computeVertexNormals();
      return g;
    } catch {
      return null;
    }
  }, [vetor, which,
    params.largura_mm, params.altura_mm, params.espessura_chapa_mm, params.contorno_mm,
    params.draft_graus, params.raio_topo_mm, params.moldura_largura_mm, params.espessura_moldura_mm,
    params.furo_ventilacao_mm, params.espaco_ventilacao_mm]);

  useEffect(() => {
    if (!geo) return;
    geo.computeBoundingSphere();
    const s = geo.boundingSphere;
    if (s) onTamanho(s.radius, s.center.z); // z das fatias = y depois da rotação para y-up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  if (!geo) return null;
  const cor = which === 'macho' ? '#e9b96e' : which === 'femea' ? '#6ea8e9' : '#9e9e9e';
  return (
    // z-up (fatias) → y-up
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={cor} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function TermoformagemPreview3D({ params, imagePath }: Props) {
  const [vetor, setVetor] = useState<Vetor>(null);
  const [peca, setPeca] = useState<Peca>('macho');
  const [estado, setEstado] = useState<'idle' | 'a_processar' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [tam, setTam] = useState<{ raio: number; y: number }>({ raio: 60, y: 10 });

  useEffect(() => {
    if (!imagePath) { setVetor(null); return; }
    let cancelado = false;
    const t = setTimeout(async () => {
      setEstado('a_processar'); setErro('');
      try {
        const r = await fetch('/api/auth/refresh', { method: 'POST' });
        const { access_token } = r.ok ? await r.json() : {};
        if (!access_token) throw new Error('Inicia sessão para pré-visualizar.');
        const res = await fetch('/api/vetorizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
          body: JSON.stringify({ image_path: imagePath, num_cores: 1, remover_fundo: 1, tolerancia: 40 }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Erro ao processar a imagem.');
        if (cancelado) return;
        setVetor(json.vetor);
        setEstado('idle');
      } catch (e: any) {
        if (cancelado) return;
        setErro(e.message ?? 'Erro ao processar a imagem.'); setEstado('erro');
      }
    }, 350);
    return () => { cancelado = true; clearTimeout(t); };
  }, [imagePath]);

  const dist = Math.max(40, tam.raio * 2.6);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true }} style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera makeDefault position={[dist * 0.6, tam.y + dist * 0.45, dist * 0.75]} fov={32} near={0.5} far={5000} />
        <Suspense fallback={null}>
          <color attach="background" args={['#15161a']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[150, 220, 180]} intensity={0.9} />
          <directionalLight position={[-150, 100, -120]} intensity={0.35} color="#aac4ff" />
          {vetor && (
            <Modelo which={peca} vetor={vetor} params={params} onTamanho={(raio, y) => setTam({ raio, y })} />
          )}
          <OrbitControls makeDefault enablePan={false} target={[0, tam.y, 0]} minDistance={10} maxDistance={dist * 4} />
        </Suspense>
      </Canvas>

      {!imagePath && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
          Carrega um SVG ou imagem da forma para veres o molde.
        </div>
      )}
      {estado === 'a_processar' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', color: '#93c5fd', fontSize: 13 }}>
          A processar imagem…
        </div>
      )}
      {estado === 'erro' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 12, textAlign: 'center', padding: 20 }}>
          {erro}
        </div>
      )}

      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
        {([['macho', 'Macho'], ['femea', 'Fêmea'], ['moldura', 'Moldura']] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setPeca(v)} style={{
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${peca === v ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
            background: peca === v ? 'rgba(59,130,246,0.18)' : 'rgba(15,23,42,0.7)',
            color: peca === v ? '#93c5fd' : '#94a3b8',
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
