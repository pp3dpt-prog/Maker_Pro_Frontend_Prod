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
  };
  camera?: {
    mode?: 'fixed' | 'autoframe';
    distance?: number;
  };
  text?: {
    enabled?: boolean;
    font?: string;
    front?: {
      source: string;
      size: number;
      depth: number;
      offset: [number, number, number];
    };
    back?: {
      source: string;
      size: number;
      depth: number;
      offset: [number, number, number];
    };
  };
};

type Props = {
  viewerSchema?: ViewerSchema;
  valores?: Record<string, any>;
  stlUrl?: string | null;
  state?: 'idle' | 'generating' | 'ready';
};

/* ======================================================
   COMPONENTE
====================================================== */
export default function STLViewer({
  viewerSchema,
  valores = {},
  stlUrl,
  state = 'idle',
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textGroupRef = useRef<THREE.Group | null>(null);
  const fontRef = useRef<any>(null);

  /* ======================================================
     INIT THREE
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

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
      camera.position.z = viewerSchema?.camera?.distance ?? 200;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
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

      const resize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      
      resize();

      const el = mountRef.current;
      if (!el) return;

      const ro = new ResizeObserver(resize);
      ro.observe(el);


      const animate = () => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();

      // cleanup
      return () => {
        disposed = true;
        ro.disconnect();
      };
    })();

    return () => {
      if (rendererRef.current) rendererRef.current.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  /* ======================================================
     LOAD STL
  ======================================================= */
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    (async () => {
      const { STLLoader } = await import(
        'three/examples/jsm/loaders/STLLoader.js'
      );

      
      const scene = sceneRef.current;
      if (!scene) return;

      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current = null;
      }


      const url =
        stlUrl ??
        viewerSchema?.base_geometry?.stl ??
        null;

      if (!url) return;

      const loader = new STLLoader();
      loader.load(url, geometry => {
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

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        if (viewerSchema?.camera?.mode !== 'fixed') {
          cameraRef.current!.position.z = maxDim * 2.2;
        }
      });
    })();
  }, [stlUrl, viewerSchema?.base_geometry?.stl]);

  /* ======================================================
     RENDER
  ======================================================= */
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
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
            fontWeight: 700,
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