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

  // runtime refs
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const zFrontRef = useRef<number>(0);
  const loadedFontRef = useRef<any>(null);
  const textGroupRef = useRef<any>(null);

  // init + load STL once per baseStlUrl
  useEffect(() => {
    if (!mountRef.current) return;

    let disposed = false;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');

      if (disposed) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
      camera.position.set(0, 0, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      mountRef.current!.innerHTML = '';
      mountRef.current!.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      // load base STL
      const loader = new STLLoader();
      loader.load(
        baseStlUrl,
        (geometry: any) => {
          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          // front face Z relative to centered mesh
          zFrontRef.current = box.max.z - center.z;

          const mat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.6,
          });

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.sub(center);
          scene.add(mesh);

          // camera distance based on size
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          camera.position.set(0, 0, Math.max(90, maxDim * 2));
          controls.target.set(0, 0, 0);
          controls.update();
        },
        undefined,
        () => {
          // ignore
        }
      );

      const animate = () => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };

      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      controlsRef.current = controls;

      animate();
    })();

    return () => {
      disposed = true;
      try {
        controlsRef.current?.dispose?.();
        rendererRef.current?.dispose?.();
      } catch {}
      if (mountRef.current) mountRef.current.innerHTML = '';
      sceneRef.current = null;
    };
  }, [baseStlUrl]);

  // load font when `font` changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
      if (cancelled) return;

      const fontUrl = FONT_MAP[font] ?? FONT_MAP['Open Sans'];
      const loader = new FontLoader();

      loader.load(
        fontUrl,
        (f: any) => {
          if (cancelled) return;
          loadedFontRef.current = f;
        },
        undefined,
        () => {
          // fallback: keep previous font if any
        }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [font]);

  // rebuild text whenever inputs change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const THREEPromise = import('three');
    const geomPromise = import('three/examples/jsm/geometries/TextGeometry.js');

    let cancelled = false;

    (async () => {
      const THREE = await THREEPromise;
      const { TextGeometry } = await geomPromise;

      if (cancelled) return;
      const loadedFont = loadedFontRef.current;

      // if font not loaded yet, wait a tick and retry on next effect tick
      if (!loadedFont) return;

      // remove previous group
      if (textGroupRef.current) {
        scene.remove(textGroupRef.current);
        textGroupRef.current = null;
      }

      // if both empty, nothing to draw
      const n = (nome ?? '').trim();
      const t = (telefone ?? '').trim();
      if (!n && !t) return;

      const group = new THREE.Group();

      const depth = relevo ? 1.2 : 0.3;
      const zFront = zFrontRef.current || 0;
      const zF = zFront + depth + 0.2;

      // helpers: center geometry in X/Y so xPos/yPos are intuitive mm offsets
      const centerXY = (geo: any) => {
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const cx = (box.min.x + box.max.x) / 2;
        const cy = (box.min.y + box.max.y) / 2;
        geo.translate(-cx, -cy, 0);
      };

      const materialFront = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const materialBack = new THREE.MeshStandardMaterial({ color: 0xffffff });

      const addText = (txt: string, invert: boolean, yOffset: number) => {
        const geo = new TextGeometry(txt, {
          font: loadedFont,
          size: fontSize,
          depth,
          curveSegments: 8,
        });

        centerXY(geo);

        const mesh = new THREE.Mesh(geo, invert ? materialBack : materialFront);

        if (invert) mesh.rotation.y = Math.PI;

        mesh.position.set(
          xPos,
          yPos + yOffset,
          invert ? -zF : zF
        );

        group.add(mesh);
      };

      // We draw BOTH strings on BOTH faces: name top, phone bottom
      const yName = 0;
      const yPhone = -fontSize * 1.5;

      if (n) {
        addText(n, false, yName); // front
        addText(n, true, yName);  // back
      }
      if (t) {
        addText(t, false, yPhone); // front
        addText(t, true, yPhone);  // back
      }

      scene.add(group);
      textGroupRef.current = group;
    })();

    return () => {
      cancelled = true;
    };
  }, [nome, telefone, fontSize, xPos, yPos, relevo, font]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: 'min(60vh, 520px)',
        minHeight: 320,
        borderRadius: 12,
        border: '1px solid #334155',
        overflow: 'hidden',
      }}
    />
  );
}