'use client';

import { useEffect, useRef, useState } from 'react';

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
  const textGroupRef = useRef<any>(null);

  // ✅ estados reativos (isto é o fix)
  const [zFront, setZFront] = useState<number | null>(null);
  const [loadedFont, setLoadedFont] = useState<any>(null);

  // init + load base STL (quando muda baseStlUrl)
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

      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      controlsRef.current = controls;

      // limpar texto antigo (se existir)
      if (textGroupRef.current) {
        scene.remove(textGroupRef.current);
        textGroupRef.current = null;
      }
      setZFront(null);

      const loader = new STLLoader();
      loader.load(
        baseStlUrl,
        (geometry: any) => {
          if (disposed) return;

          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          const zF = box.max.z - center.z;
          setZFront(zF);

          const mat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.6,
          });

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.sub(center);
          scene.add(mesh);

          // ajustar camera
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          camera.position.set(0, 0, Math.max(90, maxDim * 2));
          controls.target.set(0, 0, 0);
          controls.update();

          console.log('[STLViewer] STL carregado. zFront=', zF);
        },
        undefined,
        (err: any) => {
          console.error('[STLViewer] Erro STLLoader:', err);
        }
      );

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
      if (mountRef.current) mountRef.current.innerHTML = '';
      sceneRef.current = null;
    };
  }, [baseStlUrl]);

  // load font (quando muda `font`)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
      const fontUrl = FONT_MAP[font] ?? FONT_MAP['Open Sans'];
      const loader = new FontLoader();

      loader.load(
        fontUrl,
        (f: any) => {
          if (cancelled) return;
          setLoadedFont(f);
          console.log('[STLViewer] Fonte carregada:', fontUrl);
        },
        undefined,
        (err: any) => {
          console.error('[STLViewer] Erro FontLoader:', err, 'URL:', fontUrl);
          // fallback: tenta Open Sans
          if (fontUrl !== FONT_MAP['Open Sans']) {
            loader.load(FONT_MAP['Open Sans'], (f2: any) => {
              if (!cancelled) setLoadedFont(f2);
            });
          }
        }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [font]);

  // build/rebuild text (quando muda qualquer parâmetro)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // só desenha texto quando temos STL (zFront) e fonte carregada
    if (zFront === null || !loadedFont) return;

    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');
      if (cancelled) return;

      // remove grupo anterior
      if (textGroupRef.current) {
        scene.remove(textGroupRef.current);
        textGroupRef.current = null;
      }

      const n = (nome ?? '').trim();
      const t = (telefone ?? '').trim();
      if (!n && !t) return;

      const group = new THREE.Group();
      const depth = relevo ? 1.2 : 0.3;
      const z = zFront + depth + 0.3;

      const centerXY = (geo: any) => {
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const cx = (box.min.x + box.max.x) / 2;
        const cy = (box.min.y + box.max.y) / 2;
        geo.translate(-cx, -cy, 0);
      };

      const add = (txt: string, invert: boolean, yOffset: number) => {
        const geo = new TextGeometry(txt, {
          font: loadedFont,
          size: fontSize,
          depth,
          curveSegments: 8,
        });

        centerXY(geo);

        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geo, mat);

        if (invert) mesh.rotation.y = Math.PI;

        mesh.position.set(
          xPos,
          yPos + yOffset,
          invert ? -z : z
        );

        group.add(mesh);
      };

      // nome no centro, telefone abaixo
      if (n) {
        add(n, false, 0);
        add(n, true, 0);
      }
      if (t) {
        add(t, false, -fontSize * 1.5);
        add(t, true, -fontSize * 1.5);
      }

      scene.add(group);
      textGroupRef.current = group;

      console.log('[STLViewer] Texto desenhado. nome=', !!n, 'telefone=', !!t, 'z=', z);
    })();

    return () => {
      cancelled = true;
    };
  }, [nome, telefone, fontSize, xPos, yPos, relevo, zFront, loadedFont]);

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