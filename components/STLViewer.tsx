'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* Lazy load three.js (evita SSR issues) */
async function loadThree() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
  return { THREE, OrbitControls, STLLoader };
}

/* ──────────────────────────────────────────────
 PROPS
────────────────────────────────────────────── */
type Props = {
  blankUrl?: string | null;
  storagePath?: string | null;
  url?: string | null;
  filename?: string;

  /* ✅ Overlay imediato */
  overlayText?: string;
  overlayX?: number;
  overlayY?: number;
  overlaySize?: number;
};

export default function STLViewer({
  blankUrl = null,
  storagePath = null,
  url = null,
  filename = 'modelo.stl',

  overlayText = '',
  overlayX = 0,
  overlayY = 0,
  overlaySize = 24,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  /* ✅ Toggle overlay */
  const [showOverlay, setShowOverlay] = useState(true);

  /* Fonte do STL */
  const source = useMemo(() => {
    if (storagePath) return { kind: 'storage', value: storagePath };
    if (url) return { kind: 'url', value: url };
    if (blankUrl) return { kind: 'url', value: blankUrl };
    return null;
  }, [storagePath, url, blankUrl]);

  /* ──────────────────────────────────────────────
 INIT THREE
────────────────────────────────────────────── */
  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!mountRef.current) return;

      const { THREE, OrbitControls } = await loadThree();
      if (disposed) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
      camera.position.set(0, 0, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      /* Luz */
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      /* Controles (touch friendly) */
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.6;
      controls.zoomSpeed = 0.8;
      controls.panSpeed = 0.6;
      controls.touches = { ONE: 0, TWO: 2 };

      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);

      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      controlsRef.current = controls;

      const onResize = () => {
        if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        rendererRef.current.setSize(w, h);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      };

      window.addEventListener('resize', onResize);

      const animate = () => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };

      animate();
    })();

    return () => {
      disposed = true;
      try {
        controlsRef.current?.dispose?.();
        rendererRef.current?.dispose?.();
      } catch {}
    };
  }, []);

  /* ──────────────────────────────────────────────
 LOAD STL
────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function clearMesh() {
      if (sceneRef.current && meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current.geometry?.dispose?.();
        meshRef.current.material?.dispose?.();
        meshRef.current = null;
      }
    }

    async function loadFromUrl(stlUrl: string) {
      const { THREE, STLLoader } = await loadThree();
      const loader = new STLLoader();

      return new Promise<any>((resolve, reject) => {
        loader.load(stlUrl, (geometry: any) => resolve({ THREE, geometry }), undefined, reject);
      });
    }

    async function loadFromStorage(path: string) {
      const { data, error } = await supabase.storage.from('designs-vault').download(path);
      if (error || !data) throw error;
      const blobUrl = URL.createObjectURL(data);
      try {
        return await loadFromUrl(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }

    (async () => {
      setError(null);

      if (!source) {
        setStatus('idle');
        return;
      }

      setStatus('loading');
      await clearMesh();

      try {
        const result =
          source.kind === 'storage'
            ? await loadFromStorage(source.value)
            : await loadFromUrl(source.value);

        if (cancelled) return;

        const { THREE, geometry } = result;
        geometry.computeBoundingBox();

        const material = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.6,
        });

        const mesh = new THREE.Mesh(geometry, material);

        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        cameraRef.current.position.set(0, 0, Math.max(80, maxDim * 2));
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();

        sceneRef.current.add(mesh);
        meshRef.current = mesh;

        setStatus('ready');
      } catch (e: any) {
        setStatus('error');
        setError('Erro ao carregar STL.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  /* ──────────────────────────────────────────────
 RENDER
────────────────────────────────────────────── */
  return (
    <section style={{ marginTop: 16 }}>
      {/* Viewer container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'min(60vh, 520px)',
          minHeight: 300,
          borderRadius: 12,
          border: '1px solid #334155',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* ✅ OVERLAY DE TEXTO IMEDIATO */}
        {showOverlay && overlayText && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(${overlayX}px, ${overlayY}px) translate(-50%, -50%)`,
              fontSize: overlaySize,
              fontWeight: 700,
              color: 'white',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 0 6px rgba(0,0,0,0.7)',
            }}
          >
            {overlayText}
          </div>
        )}
      </div>

      {/* ✅ BOTÃO OVERLAY ON/OFF */}
      {overlayText && (
        <button
          onClick={() => setShowOverlay(v => !v)}
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #334155',
            background: showOverlay ? '#22c55e' : '#020617',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          {showOverlay ? 'OCULTAR TEXTO' : 'MOSTRAR TEXTO'}
        </button>
      )}

      {status === 'loading' && <p style={{ color: '#94a3b8' }}>A carregar modelo…</p>}
      {status === 'error' && <p style={{ color: '#fca5a5' }}>{error}</p>}
    </section>
  );
}