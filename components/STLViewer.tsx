'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Lazy imports para reduzir bundle e evitar SSR issues
async function loadThree() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
  return { THREE, OrbitControls, STLLoader };
}

type ValoresProduto = Record<string, string | number | boolean>;

type Props = {
  /** URL do blank rápido (ex: /models/blank_redondo.stl) */
  blankUrl?: string | null;

  /** storagePath do preview exacto ou final (privado) */
  storagePath?: string | null;

  /** signed url (opcional) */
  url?: string | null;

  /** nome do ficheiro ao descarregar (opcional) */
  filename?: string;

  /** se quiseres esconder botões */
  showButtons?: boolean;
};

export default function STLViewer({
  blankUrl = null,
  storagePath = null,
  url = null,
  filename = 'modelo.stl',
  showButtons = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Escolha de fonte: prioridade -> storagePath -> url -> blankUrl
  const source = useMemo(() => {
    if (storagePath) return { kind: 'storagePath' as const, value: storagePath };
    if (url) return { kind: 'url' as const, value: url };
    if (blankUrl) return { kind: 'url' as const, value: blankUrl };
    return null;
  }, [storagePath, url, blankUrl]);

  // init three
  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!mountRef.current) return;

      const { THREE, OrbitControls } = await loadThree();
      if (disposed) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0b1220');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
      camera.position.set(0, 0, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // light
      const ambient = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(50, 80, 120);
      scene.add(dir);

      // controls (touch friendly)
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.6;
      controls.zoomSpeed = 0.8;
      controls.panSpeed = 0.6;

      // touch mapping
      controls.touches = {
        ONE: 0,      // ROTATE
        TWO: 2,      // DOLLY_PAN
      };

      // mount
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

      return () => {
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      disposed = true;
      try {
        controlsRef.current?.dispose?.();
        rendererRef.current?.dispose?.();
      } catch {}
    };
  }, []);

  // load STL whenever source changes
  useEffect(() => {
    let cancelled = false;

    async function clearMesh() {
      const scene = sceneRef.current;
      const mesh = meshRef.current;
      if (scene && mesh) {
        scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
        meshRef.current = null;
      }
    }

    async function loadStlFromUrl(stlUrl: string) {
      const { THREE, STLLoader } = await loadThree();
      if (cancelled) return;

      const loader = new STLLoader();
      return new Promise<any>((resolve, reject) => {
        loader.load(
          stlUrl,
          (geometry: any) => resolve({ THREE, geometry }),
          undefined,
          (err: any) => reject(err)
        );
      });
    }

    async function loadStlFromStorage(pathInBucket: string) {
      const { data, error } = await supabase.storage
        .from('designs-vault')
        .download(pathInBucket);

      if (error) throw error;
      if (!data) throw new Error('Download vazio (storagePath).');

      const blobUrl = URL.createObjectURL(data);
      try {
        const out = await loadStlFromUrl(blobUrl);
        return out;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }

    (async () => {
      setError(null);

      if (!source) {
        await clearMesh();
        setStatus('idle');
        return;
      }

      setStatus('loading');

      try {
        await clearMesh();

        let loaded;
        if (source.kind === 'storagePath') {
          loaded = await loadStlFromStorage(source.value);
        } else {
          loaded = await loadStlFromUrl(source.value);
        }

        if (cancelled) return;

        const { THREE, geometry } = loaded;
        geometry.computeBoundingBox();

        const material = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          metalness: 0.1,
          roughness: 0.6,
        });

        const mesh = new THREE.Mesh(geometry, material);

        // centrar
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);

        // ajustar camera
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
        setError(e?.message || 'Falha ao carregar STL.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  async function handleDownload() {
    try {
      if (storagePath) {
        const { data, error } = await supabase.storage.from('designs-vault').download(storagePath);
        if (error) throw error;
        if (!data) throw new Error('Download vazio.');

        const objectUrl = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        return;
      }

      if (url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error('Falha ao descarregar (url).');
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro no download.');
      setStatus('error');
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: 'min(60vh, 520px)',
          borderRadius: 12,
          border: '1px solid #334155',
          overflow: 'hidden',
          touchAction: 'none', // crítico para touch orbit
        }}
      />

      {status === 'loading' && (
        <p style={{ color: '#cbd5e1', marginTop: 10 }}>A carregar modelo 3D…</p>
      )}

      {status === 'idle' && (
        <p style={{ color: '#94a3b8', marginTop: 10 }}>Sem modelo para mostrar.</p>
      )}

      {status === 'error' && (
        <p style={{ color: '#fca5a5', marginTop: 10 }}>
          {error || 'Erro no viewer.'}
        </p>
      )}

      {showButtons && (storagePath || url) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#10b981',
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Descarregar STL
          </button>
        </div>
      )}
    </section>
  );
}