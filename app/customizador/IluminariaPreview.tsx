'use client';

// Pré-visualização das iluminárias (abajur torcido / candeeiro perfurado).
// Usa a MESMA geometria do STL (lib/iluminariasGeom.js, igual ao Docker
// app/iluminariasGeom.js) e mostra a base com a forma da peça.

import { useMemo } from 'react';
import * as THREE from 'three';
// @ts-ignore — módulo JS partilhado com o backend
import { iluminaria, LIP_H } from '@/lib/iluminariasGeom';

export function geradorIluminaria(params: Record<string, any>): string | null {
  if (params?.torcao_graus !== undefined && params?.perfil !== undefined) return 'iluminaria-torcida';
  if (params?.padrao !== undefined && params?.tamanho_furo_mm !== undefined) return 'iluminaria-perfurada';
  return null;
}

export default function IluminariaPreview({ params, luzAcesa }: { params: Record<string, any>; luzAcesa: boolean }) {
  const gerador = geradorIluminaria(params) ?? 'iluminaria-torcida';
  const depsKey = JSON.stringify(params);

  const dados = useMemo(() => {
    const r: any = iluminaria(gerador, params, { resolucao: 0.35 });
    const peca = new THREE.BufferGeometry();
    peca.setAttribute('position', new THREE.Float32BufferAttribute(r.tris, 3));
    peca.computeVertexNormals();
    // Base: contorno exterior extrudido (z para cima)
    const forma = new THREE.Shape((r.baseExt as number[][]).map(([x, y]) => new THREE.Vector2(x, y)));
    const base = new THREE.ExtrudeGeometry(forma, { depth: r.c.hb, bevelEnabled: false, curveSegments: 1 });
    return { r, peca, base };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gerador, depsKey]);

  const { r, peca, base } = dados;
  const torcida = r.c.tipo === 'iluminaria-torcida';
  const hb = r.c.hb;

  return (
    // z-up → y-up
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={base}>
        <meshStandardMaterial color="#2b2c31" roughness={0.6} />
      </mesh>
      {/* A peça assenta na base, por cima do rebordo de encaixe */}
      <mesh geometry={peca} position={[0, 0, hb]}>
        <meshStandardMaterial
          color={torcida ? '#f5efe4' : '#e9e6df'}
          roughness={0.5}
          side={THREE.DoubleSide}
          emissive={luzAcesa && torcida ? '#ffb45a' : '#000000'}
          emissiveIntensity={luzAcesa && torcida ? 0.55 : 0}
        />
      </mesh>
      {/* Núcleo de luz (lâmpada) — vê-se através dos furos do perfurado */}
      {luzAcesa && !torcida && (
        <mesh position={[0, 0, hb + r.c.H * 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[(r.apInt ?? 30) * 0.55, (r.apInt ?? 30) * 0.55, r.c.H * 0.8, 32]} />
          <meshBasicMaterial color="#ffd08a" toneMapped={false} />
        </mesh>
      )}
      {luzAcesa && (
        <pointLight position={[0, 0, hb + LIP_H + 20]} color="#ffc27a" intensity={torcida ? 2500 : 6000} distance={0} decay={2} />
      )}
    </group>
  );
}
