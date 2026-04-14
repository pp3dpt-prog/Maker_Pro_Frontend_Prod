'use client';

import { useEffect, useRef } from 'react';

type Props = {
  baseStlUrl: string;

  nome?: string;
  telefone?: string;

  font?: string;

  // NOME (frente)
  fontSize?: number;
  xPos?: number;
  yPos?: number;

  // CONTACTO (verso)
  fontSizeN?: number;
  xPosN?: number;
  yPosN?: number;

  relevo?: boolean;
};

function fontCandidates(fontName: string) {
  const f = (fontName || '').trim();
  const lower = f.toLowerCase();
  // tenta várias combinações porque em produção (Linux) é case-sensitive
  return [
    `/fonts/${f}.json`,
    `/fonts/${lower}.json`,
    `/fonts/${lower.replace(/\s+/g, '')}.json`,
  ];
}

export default function STLViewer({
  baseStlUrl,
  nome = '',
  telefone = '',
  font = 'Aladin',

  fontSize = 10,
  xPos = 0,
  yPos = 0,

  fontSizeN = 8,
  xPosN = 0,
  yPosN = -10,

  relevo = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const THREERef = useRef<any>(null);
  const TextGeometryRef = useRef<any>(null);

  const zFrontRef = useRef<number>(0);
  const loadedFontRef = useRef<any>(null);
  const textGroupRef = useRef<any>(null);

  // init
  useEffect(() => {
    if (!mountRef.current) return;

    let disposed = false;
    let animationId = 0;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');

      THREERef.current = THREE;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const w = mountRef.current!.clientWidth;
      const h = mountRef.current!.clientHeight;

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
      camera.position.set(0, 0, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mountRef.current!.innerHTML = '';
      mountRef.current!.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      // STL
      const loader = new STLLoader();
      loader.load(
        baseStlUrl,
        (geometry: any) => {
          if (disposed) return;

          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          zFrontRef.current = box.max.z - center.z;

          const mat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.6,
          });

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.sub(center);
          scene.add(mesh);

          // se já houver fonte carregada, reconstrói texto
          if (loadedFontRef.current) rebuildText();
        },
        undefined,
        (err: any) => console.error('Erro STLLoader:', err)
      );

      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      controlsRef.current = controls;

      const animate = () => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      };

      animate();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      try {
        controlsRef.current?.dispose?.();
        rendererRef.current?.dispose?.();
      } catch {}
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStlUrl]);

  // load font (on change)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');
      TextGeometryRef.current = TextGeometry;

      const loader = new FontLoader();
      const candidates = fontCandidates(font);

      const tryLoad = (i: number) => {
        if (i >= candidates.length) {
          console.error('❌ Falha a carregar fonte (todas as tentativas):', font, candidates);
          return;
        }
        const url = candidates[i];
        loader.load(
          url,
          (f: any) => {
            if (cancelled) return;
            loadedFontRef.current = f;
            rebuildText();
          },
          undefined,
          (err: any) => {
            console.warn('Falha a carregar fonte:', url, err);
            tryLoad(i + 1);
          }
        );
      };

      tryLoad(0);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font]);

  // rebuild on prop changes
  useEffect(() => {
    rebuildText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, telefone, fontSize, xPos, yPos, fontSizeN, xPosN, yPosN, relevo]);

  function rebuildText() {
    const scene = sceneRef.current;
    const THREE = THREERef.current;
    const TextGeometry = TextGeometryRef.current;
    const loadedFont = loadedFontRef.current;

    if (!scene || !THREE || !TextGeometry || !loadedFont) return;

    if (textGroupRef.current) {
      scene.remove(textGroupRef.current);
      textGroupRef.current = null;
    }

    if (!nome && !telefone) return;

    const group = new THREE.Group();
    const depth = relevo ? 1.2 : 0.3;
    const zFront = zFrontRef.current || 0;

    const makeText = (txt: string, invert: boolean, x: number, y: number, size: number, z: number) => {
      const geo = new TextGeometry(txt, {
        font: loadedFont,
        size,
        depth,
        curveSegments: 8,
      });

      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);

      if (invert) mesh.rotation.y = Math.PI;

      mesh.position.set(x, y, z);
      return mesh;
    };

    // NOME: só frente
    if (nome) {
      group.add(makeText(nome, false, xPos, yPos, fontSize, zFront + depth));
    }

    // TELEFONE: só verso (espelhado)
    if (telefone) {
      group.add(makeText(telefone, true, xPosN, yPosN, fontSizeN, -(zFront + depth)));
    }

    scene.add(group);
    textGroupRef.current = group;
  }

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
