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

      const w = mountRef.current!.clientWidth;
      const h = mountRef.current!.clientHeight;

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
      camera.position.z = viewerSchema?.camera?.distance ?? 200;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
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
     LOAD FONT
  ======================================================= */

  useEffect(() => {
    if (!viewerSchema?.text?.enabled) return;

    (async () => {
      const { FontLoader } = await import(
        'three/examples/jsm/loaders/FontLoader.js'
      );

      const loader = new FontLoader();
      const fontName = viewerSchema.text?.font ?? 'Aladin';

      loader.load(`/fonts/${fontName}.json`, font => {
        fontRef.current = font;
        rebuildText();
      });
    })();
  }, [viewerSchema?.text]);

  /* ======================================================
     LOAD STL
  ======================================================= */

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    (async () => {
      const { STLLoader } = await import(
        'three/examples/jsm/loaders/STLLoader.js'
      );

      if (meshRef.current && sceneRef.current) {
        sceneRef.current.remove(meshRef.current);
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

        const mat = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.65,
        });

        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.sub(center);
        sceneRef.current!.add(mesh);
        meshRef.current = mesh;

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (viewerSchema?.camera?.mode !== 'fixed') {
          cameraRef.current!.position.z = maxDim * 2.2;
        }

        rebuildText();
      });
    })();
  }, [stlUrl, viewerSchema?.base_geometry?.stl]);

  /* ======================================================
     TEXTO (PREVIEW)
  ======================================================= */

  function rebuildText() {
    if (
      !sceneRef.current ||
      !fontRef.current ||
      !viewerSchema?.text?.enabled
    )
      return;

    if (textGroupRef.current) {
      sceneRef.current.remove(textGroupRef.current);
      textGroupRef.current = null;
    }

    const { TextGeometry } = require('three/examples/jsm/geometries/TextGeometry');
    const group = new THREE.Group();

    const centerXY = (geo: any) => {
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(
        -(box.min.x + box.max.x) / 2,
        -(box.min.y + box.max.y) / 2,
        0
      );
    };

    const build = (cfg: {
      source: string;
      size: number;
      depth: number;
      offset: [number, number, number];
    }) => {
      const value = String(valores[cfg.source] ?? '');
      if (!value) return null;

      const geo = new TextGeometry(value, {
        font: fontRef.current,
        size: cfg.size,
        depth: cfg.depth,
      });

      centerXY(geo);

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );

      const [ox, oy, oz] = cfg.offset;
      mesh.position.set(ox, oy, oz);

      return mesh;
    };

    if (viewerSchema.text.front) {
      const m = build(viewerSchema.text.front);
      if (m) group.add(m);
    }

    if (viewerSchema.text.back) {
      const m = build(viewerSchema.text.back);
      if (m) {
        m.rotation.y = Math.PI;
        group.add(m);
      }
    }

    sceneRef.current.add(group);
    textGroupRef.current = group;
  }

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
