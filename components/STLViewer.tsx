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

const FONT_MAP: Record<string, string> = {
  'Open Sans': '/fonts/OpenSans-Regular.json',
  'Open Sans Bold': '/fonts/OpenSans-Bold.json',
  'Roboto': '/fonts/Roboto-Regular.json',
};

export default function STLViewer({
  baseStlUrl,
  nome = '',
  telefone = '',
  font = 'Open Sans',
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
    let zFront = 0;

    (async () => {
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

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      /* STL BASE */
      const loader = new STLLoader();
      loader.load(baseStlUrl, (geometry: any) => {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);

        zFront = box.max.z - center.z;

        const mat = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          roughness: 0.6,
        });

        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.sub(center);
        scene.add(mesh);
      });

      /* TEXTO 3D */
      const fontLoader = new FontLoader();
      const fontUrl = FONT_MAP[font] ?? FONT_MAP['Open Sans'];

      fontLoader.load(fontUrl, (loadedFont: any) => {
        if (textGroup) scene.remove(textGroup);
        textGroup = new THREE.Group();

        const depth = relevo ? 1.2 : 0.3;

        const makeText = (txt: string, invert: boolean, yOffset = 0) => {
          const geo = new TextGeometry(txt, {
            font: loadedFont,
            size: fontSize,
            depth,
            curveSegments: 8,
          });

          const mat = new THREE.MeshStandardMaterial({
            color: 0xff0000, // contraste forte
          });

          const mesh = new THREE.Mesh(geo, mat);

          if (invert) mesh.rotation.y = Math.PI;

          mesh.position.set(
            xPos,
            yPos + yOffset,
            invert ? -(zFront + depth) : (zFront + depth)
          );

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
  }, [baseStlUrl, nome, telefone, font, fontSize, xPos, yPos, relevo]);

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