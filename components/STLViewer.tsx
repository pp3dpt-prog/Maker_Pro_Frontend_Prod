'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  baseStlUrl: string;

  // Frente
  nome?: string;

  // Verso
  telefone?: string;

  // Fonte (tem de ser uma key do FONT_MAP)
  font?: string;

  // mm
  fontSize?: number;
  xPos?: number;
  yPos?: number;

  // relevo apenas para o NOME (frente)
  relevo?: boolean;
};

/**
 * IMPORTANTÍSSIMO: paths EXACTOS (case-sensitive em Vercel/Linux)
 * Estes ficheiros têm de existir em: public/fonts/...
 * e ficam acessíveis via /fonts/...
 * (Next.js serve /public a partir da raiz) [1](https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder)[2](https://nextjs.org/docs/14/app/building-your-application/optimizing/static-assets)
 */
const FONT_MAP: Record<string, string> = {
  'Aladin': '/fonts/Aladin.json',
  'Amarante': '/fonts/amarante.json',
  'Baloo 2': '/fonts/baloo2.json',
  'Benne': '/fonts/benne.json',
};

export default function STLViewer({
  baseStlUrl,
  nome = '',
  telefone = '',
  font = 'Amarante',
  fontSize = 7,
  xPos = 0,
  yPos = 0,
  relevo = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Runtime refs
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // Texto atual (grupo)
  const textGroupRef = useRef<any>(null);

  // Estados reativos para garantir ordem correta:
  // só desenhamos texto quando STL e fonte estiverem prontos.
  const [zFront, setZFront] = useState<number | null>(null);
  const [loadedFont, setLoadedFont] = useState<any>(null);

  /**
   * 1) INIT + LOAD STL base (quando muda baseStlUrl)
   */
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

      // Luz
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(80, 100, 120);
      scene.add(dir);

      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      controlsRef.current = controls;

      // Reset do estado dependente do STL
      setZFront(null);

      // Remove texto anterior, se existir
      if (textGroupRef.current) {
        scene.remove(textGroupRef.current);
        textGroupRef.current = null;
      }

      // Load STL base
      const loader = new STLLoader();
      loader.load(
        baseStlUrl,
        (geometry: any) => {
          if (disposed) return;

          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);

          // Face frontal em Z (no espaço depois de centrar)
          const zF = box.max.z - center.z;
          setZFront(zF);

          const mat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            roughness: 0.6,
          });

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.sub(center);
          scene.add(mesh);

          // Ajustar camera ao tamanho da peça
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          camera.position.set(0, 0, Math.max(90, maxDim * 2));
          controls.target.set(0, 0, 0);
          controls.update();
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

  /**
   * 2) LOAD FONT (quando muda font)
   * FontLoader usa Typeface JSON (não TTF) [3](https://threejs.org/docs/pages/FontLoader.html)[4](https://threejs-journey.com/lessons/3d-text)
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');

      const fontUrl = FONT_MAP[font] ?? FONT_MAP['Amarante'];
      const loader = new FontLoader();

      loader.load(
        fontUrl,
        (f: any) => {
          if (cancelled) return;
          setLoadedFont(f);
        },
        undefined,
        (err: any) => {
          console.error('[STLViewer] Erro FontLoader:', err, 'URL:', fontUrl);
          // fallback para Amarante
          if (fontUrl !== FONT_MAP['Amarante']) {
            loader.load(FONT_MAP['Amarante'], (f2: any) => {
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

  /**
   * 3) BUILD/REBUILD TEXT (quando muda qualquer input)
   * Regras:
   * - NOME: só na FRENTE (pode ter relevo)
   * - TELEFONE: só no VERSO e PLANO (sem relevo)
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // só desenhar quando temos STL e fonte
    if (zFront === null || !loadedFont) return;

    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');

      if (cancelled) return;

      // Remove grupo anterior
      if (textGroupRef.current) {
        scene.remove(textGroupRef.current);
        textGroupRef.current = null;
      }

      const n = (nome ?? '').trim();
      const t = (telefone ?? '').trim();

      if (!n && !t) return;

      const group = new THREE.Group();

      // Distância da superfície para evitar z-fighting
      const surfaceGap = 0.25;

      // ===== Helpers
      const centerXY = (geo: any) => {
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const cx = (box.min.x + box.max.x) / 2;
        const cy = (box.min.y + box.max.y) / 2;
        geo.translate(-cx, -cy, 0);
      };

      // ===== NOME (FRENTE) - relevo opcional
      if (n) {
        const depthName = relevo ? 1.0 : 0.25;

        const geoName = new TextGeometry(n, {
          font: loadedFont,
          size: fontSize,
          depth: depthName,
          curveSegments: 8,
        });

        centerXY(geoName);

        const matName = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.6,
        });

        const meshName = new THREE.Mesh(geoName, matName);

        // Frente: Z positivo (fora da face)
        const zName = zFront + surfaceGap;

        meshName.position.set(xPos, yPos, zName);
        group.add(meshName);
      }

      // ===== TELEFONE (VERSO) - PLANO (sem relevo)
      if (t) {
        // 2D shapes (plano) gerado pela fonte
        const shapes = loadedFont.generateShapes(t, fontSize);
        const geo2d = new THREE.ShapeGeometry(shapes);

        // centrar
        geo2d.computeBoundingBox();
        const box2d = geo2d.boundingBox!;
        const cx = (box2d.min.x + box2d.max.x) / 2;
        const cy = (box2d.min.y + box2d.max.y) / 2;
        geo2d.translate(-cx, -cy, 0);

        // material plano, com polygonOffset para não “piscar” na superfície
        const matFlat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.8,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });

        const meshFlat = new THREE.Mesh(geo2d, matFlat);

        // Verso: rodar 180º para ler corretamente
        meshFlat.rotation.y = Math.PI;

        const yPhone = yPos - fontSize * 1.5;

        // Verso: Z negativo (ligeiramente fora)
        const zPhone = -(zFront + surfaceGap);

        meshFlat.position.set(xPos, yPhone, zPhone);
        group.add(meshFlat);
      }

      scene.add(group);
      textGroupRef.current = group;
    })();

    return () => {
      cancelled = true;
    };
  }, [nome, telefone, font, fontSize, xPos, yPos, relevo, zFront, loadedFont]);

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