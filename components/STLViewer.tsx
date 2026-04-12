'use client';

import { useEffect, useRef } from 'react';

type Props = {
  baseStlUrl: string;
  nome?: string;
  telefone?: string;
  font?: string; 
  fontSize?: number; // mm
  xPos?: number;     // mm
  yPos?: number;     // mm
  relevo?: boolean;
};

export default function STLViewer({
  baseStlUrl,
  nome = '',
  telefone = '',
  fontSize = 7,
  xPos = 0,
  yPos = 0,
  relevo = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let disposed = false;
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;
    let textGroup: any;

    (async () => {
      // ✅ imports dinâmicos (Next-safe)
      const THREE = await import('three');
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );
      const { STLLoader } = await import(
        'three/examples/jsm/loaders/STLLoader.js'
      );
      const { FontLoader } = await import(
        'three/examples/jsm/loaders/FontLoader.js'
      );
      const { TextGeometry } = await import(
        'three/examples/jsm/geometries/TextGeometry.js'
      );

      if (disposed) return;

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;

      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
      camera.position.set(0, 0, 120);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mountRef.current!.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      // Base STL
      const stlLoader = new STLLoader();
      stlLoader.load(baseStlUrl, (geometry: any) => {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.6,
        });

        geometry.computeBoundingBox();
        const mesh = new THREE.Mesh(geometry, mat);

        const center = new THREE.Vector3();
        geometry.boundingBox?.getCenter(center);
        mesh.position.sub(center);

        scene.add(mesh);
      });

      // Texto 3D
      const fontLoader = new FontLoader();
      fontLoader.load('/fonts/OpenSans-Regular.json', (font: any) => {
        if (textGroup) scene.remove(textGroup);
        textGroup = new THREE.Group();

        const depth = relevo ? 1.2 : 0.3;

        const makeText = (txt: string, invert: boolean, yOffset = 0) => {
          const geo = new TextGeometry(txt, {
            font,
            size: fontSize,
            depth: depth,
            curveSegments: 8,
          });

          const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const mesh = new THREE.Mesh(geo, mat);

          if (invert) mesh.rotation.y = Math.PI;
          mesh.position.set(xPos, yPos + yOffset, invert ? -depth : depth);

          return mesh;
        };

        if (nome) {
          textGroup.add(makeText(nome, false, 0)); // frente
          textGroup.add(makeText(nome, true, 0));  // verso
        }

        if (telefone) {
          textGroup.add(makeText(telefone, true, -fontSize * 1.5));
        }

        scene.add(textGroup);
      });

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
      if (renderer) renderer.dispose();
      if (mountRef.current?.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    };
  }, [baseStlUrl, nome, telefone, fontSize, xPos, yPos, relevo]);

  return (
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
  );
}