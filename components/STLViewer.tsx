'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

type ViewerState = 'idle' | 'generating' | 'ready';

export type ViewerSchema = {
  grid?: boolean;
  autoFrame?: boolean;
};

type Props = {
  stlUrl?: string;
  state?: ViewerState;
  schema?: ViewerSchema;
};

export default function STLViewer({ stlUrl, state = 'idle', schema }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stlUrl) return;

    // =========================
    // SCENE
    // =========================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617');

    // =========================
    // CAMERA (Z-UP ✅)
    // =========================
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );

    // CRÍTICO: alinhar com OpenSCAD (Z é o eixo vertical)
    camera.up.set(0, 0, 1);

    // =========================
    // RENDERER
    // =========================
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // =========================
    // LIGHTS
    // =========================
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(200, 200, 400); // vindo de cima
    scene.add(dir);

    // =========================
    // GRID (Z = 0)
    // =========================
    if (schema?.grid !== false) {
      const grid = new THREE.GridHelper(500, 20, 0x334155, 0x1e293b);
      grid.rotateX(Math.PI / 2); // GridHelper é Y-up por defeito → alinhar para Z-up
      scene.add(grid);
    }

    // =========================
    // CONTROLS
    // =========================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;

    // =========================
    // LOAD STL
    // =========================
    const loader = new STLLoader();
    let mesh: THREE.Mesh | null = null;

    loader.load(
      stlUrl,
      (geometry: THREE.BufferGeometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const box = geometry.boundingBox!;
        const size = new THREE.Vector3();
        box.getSize(size);

        // ⚠️ IMPORTANTE:
        // NÃO recentrar pelo centro (quebraria caixa+tampa).
        // Ancorar no mínimo → base em Z=0 e relação preservada.
        geometry.translate(-box.min.x, -box.min.y, -box.min.z);

        const material = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.5,
          metalness: 0.05,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // =========================
        // AUTO-FRAME CAMERA
        // =========================
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.2;

        camera.position.set(distance, -distance, distance * 0.9);
        camera.lookAt(0, 0, size.z * 0.5);

        controls.target.set(0, 0, size.z * 0.5);
        controls.update();
      },
      undefined,
      (error: ErrorEvent) => {
        console.error('Erro ao carregar STL:', error);
      }
    );

    // =========================
    // RESIZE
    // =========================
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', onResize);

    // =========================
    // LOOP
    // =========================
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // =========================
    // CLEANUP
    // =========================
    return () => {
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    };
  }, [stlUrl, schema]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        border: '1px solid #334155',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {state === 'generating' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            background: 'rgba(2,6,23,0.35)',
            backdropFilter: 'blur(2px)',
            zIndex: 1,
          }}
        >
          A gerar STL…
        </div>
      )}
    </div>
  );
}