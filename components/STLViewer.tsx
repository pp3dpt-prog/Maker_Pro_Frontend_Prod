'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ======================================================
   TIPOS
====================================================== */

export type ViewerSchema = {
  base_geometry?: {
    mode?: 'static' | 'generated' | 'none';
    stl?: string | null;
    allow_empty?: boolean;
  };
  camera?: {
    mode?: 'fixed' | 'autoframe';
    distance?: number;
  };
};

type Props = {
  viewerSchema?: ViewerSchema;

  /** STL gerado pelo backend (ex: caixas) */
  stlUrl?: string | null;

  /** Estado do viewer (UX loading) */
  state?: 'idle' | 'generating' | 'ready';
};

/* ======================================================
   COMPONENTE
====================================================== */

export default function STLViewer({
  viewerSchema,
  stlUrl,
  state = 'idle',
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  /* ======================================================
     INIT THREE (executa uma vez)
  ======================================================= */

  useEffect(() => {
    if (!mountRef.current) return;

    let disposed = false;

    (async () => {
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
      camera.position.z = viewerSchema?.camera?.distance ?? 200;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      mountRef.current!.innerHTML = '';
      mountRef.current!.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));

      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(150, 150, 300);
      scene.add(light);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;

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
      if (rendererRef.current) rendererRef.current.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  /* ======================================================
     LOAD STL (base ou gerado)
  ======================================================= */

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    let cancelled = false;

    (async () => {
      const { STLLoader } = await import(
        'three/examples/jsm/loaders/STLLoader.js'
      );

      // remover mesh anterior
      
      if (sceneRef.current && meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current = null;
      }


      const url =
        stlUrl ??
        viewerSchema?.base_geometry?.stl ??
        null;

      if (!url) return;

      const loader = new STLLoader();

      loader.load(
        url,
        geometry => {
          if (cancelled) return;

          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          const material = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.65,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.sub(center);

          sceneRef.current!.add(mesh);
          meshRef.current = mesh;

          // autoframe (importante para caixas)
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);

          if (viewerSchema?.camera?.mode !== 'fixed') {
            cameraRef.current!.position.z = maxDim * 2.2;
          }
        },
        undefined,
        err => console.error('Erro ao carregar STL:', err)
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [stlUrl, viewerSchema?.base_geometry?.stl]);

  /* ======================================================
     RENDER
  ======================================================= */

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: 'min(60vh, 520px)',
          borderRadius: 12,
          border: '1px solid #334155',
          overflow: 'hidden',
        }}
      />

      {state === 'generating' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2,6,23,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: 16,
            zIndex: 10,
          }}
        >
          ⏳ A gerar modelo 3D…
        </div>
      )}
    </div>
  );
}
