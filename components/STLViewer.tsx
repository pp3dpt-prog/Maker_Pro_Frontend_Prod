'use client';

import { useEffect, useRef } from 'react';

type Props = {
  baseStlUrl: string;

  // textos
  nome?: string;
  telefone?: string;

  // fonte escolhida no UI (ex.: "Aladin", "Amarante", "Baloo2", "Benne")
  font?: string;

  // NOME (frente)
  fontSize?: number; // mm
  xPos?: number;     // mm
  yPos?: number;     // mm

  // CONTACTO (verso)
  fontSizeN?: number; // mm
  xPosN?: number;     // mm
  yPosN?: number;     // mm

  relevo?: boolean;
};

function tryFontCandidates(fontName: string) {
  const f = (fontName || '').trim();
  const lower = f.toLowerCase();

  // caminhos candidatos (case-insensitive). Ajusta se usares outros nomes.
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

  // nome
  fontSize = 10,
  xPos = 0,
  yPos = 0,

  // contacto
  fontSizeN = 8,
  xPosN = 0,
  yPosN = -10,

  relevo = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // refs para não recriar a cena toda a cada keystroke
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const THREERef = useRef<any>(null);
  const TextGeometryRef = useRef<any>(null);

  const zFrontRef = useRef<number>(0);
  const loadedFontRef = useRef<any>(null);
  const textGroupRef = useRef<any>(null);
  const currentFontUrlRef = useRef<string>('');

  // init (base STL + camera + lights + controls)
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

      // carregar STL base
      const loader = new STLLoader();
      loader.load(
        baseStlUrl,
        (geometry: any) => {
          if (disposed) return;

          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          // z da face frontal depois de centrar o mesh
          zFrontRef.current = box.max.z - center.z;

          const mat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.6,
          });

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.sub(center);
          scene.add(mesh);

          // quando o STL chega, se já houver fonte, reconstroi texto
          if (loadedFontRef.current) {
            // trigger rebuild via estado (chamamos diretamente)
            rebuildText();
          }
        },
        undefined,
        (err: any) => console.error('Erro STLLoader:', err)
      );

      sceneRef.current = scene;
      rendererRef.current = renderer;
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
        animationId = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        window.removeEventListener('resize', onResize);
      };
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

  // carregar fonte + TextGeometry (dinâmico, Next-safe)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const THREE = THREERef.current ?? (await import('three'));
      THREERef.current = THREE;

      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');
      TextGeometryRef.current = TextGeometry;

      const candidates = tryFontCandidates(font);
      const loader = new FontLoader();

      // tenta candidatos até um carregar
      const tryLoad = (idx: number) => {
        if (idx >= candidates.length) {
          console.error('❌ Nenhuma fonte carregou para:', font, 'candidatos:', candidates);
          return;
        }

        const url = candidates[idx];
        loader.load(
          url,
          (f: any) => {
            if (cancelled) return;
            loadedFontRef.current = f;
            currentFontUrlRef.current = url;
            rebuildText();
          },
          undefined,
          (err: any) => {
            console.warn('Falha a carregar fonte:', url, err);
            tryLoad(idx + 1);
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

  // rebuild do texto sempre que mudam props relevantes
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

    // remove texto anterior
    if (textGroupRef.current) {
      scene.remove(textGroupRef.current);
      textGroupRef.current = null;
    }

    // se não há texto, não desenha nada
    if (!nome && !telefone) return;

    const group = new THREE.Group();
    const depth = relevo ? 1.2 : 0.3;
    const zFront = zFrontRef.current || 0;

    const makeText = (txt: string, invert: boolean, x: number, y: number, size: number) => {
      const geo = new TextGeometry(txt, {
        font: loadedFont,
        size,
        depth,
        curveSegments: 8,
      });

      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);

      if (invert) mesh.rotation.y = Math.PI;

      mesh.position.set(
        x,
        y,
        invert ? -(zFront + depth) : (zFront + depth)
      );

      return mesh;
    };

    // NOME: frente + verso (para veres nas duas faces)
    if (nome) {
      group.add(makeText(nome, false, xPos, yPos, fontSize));
      group.add(makeText(nome, true, xPos, yPos, fontSize));
    }

    // TELEFONE: só verso (normal) – com controlo separado (*N)
    if (telefone) {
      group.add(makeText(telefone, true, xPosN, yPosN, fontSizeN));
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