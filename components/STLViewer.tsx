'use client';
import { useEffect, useRef } from 'react';

/* =========================================================
   TIPOS
========================================================= */

type ViewerSchema = {
  base_geometry?: {
    mode?: 'static' | 'generated' | 'none';
    stl?: string | null;
    allow_empty?: boolean;
  };
  text?: {
    enabled?: boolean;
    sides?: ('front' | 'back')[];
    front?: {
      source: string;
      extrude?: boolean;
      depth?: number;
      surface_gap?: number;
    };
    back?: {
      source: string;
      extrude?: boolean;
      surface_gap?: number;
    };
    fonts?: {
      allowed?: string[];
      default?: string;
    };
  };
  camera?: {
    mode?: 'fixed' | 'autoframe';
    distance?: number;
  };
};

type Props = {
  /** LEGACY (continuam a funcionar) */
  baseStlUrl?: string;
  nome?: string;
  telefone?: string;
  font?: string;
  fontSize?: number;
  xPos?: number;
  yPos?: number;
  fontSizeN?: number;
  xPosN?: number;
  yPosN?: number;
  relevo?: boolean;

  /** NOVO (BD-driven) */
  viewerSchema?: ViewerSchema;
  valores?: Record<string, any>;
};

/* =========================================================
   HELPERS
========================================================= */

function fontCandidates(fontName: string) {
  const f = (fontName || '').trim();
  const lower = f.toLowerCase();
  return [
    `/fonts/${f}.json`,
    `/fonts/${lower}.json`,
    `/fonts/${lower.replace(/\s+/g, '')}.json`,
  ];
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function STLViewer(props: Props) {
  const {
    viewerSchema,
    valores = {},

    // legacy
    baseStlUrl,
    nome = '',
    telefone = '',
    font = 'Aladin',
    fontSize = 9,
    xPos = 0,
    yPos = 0,
    fontSizeN = 7,
    xPosN = 0,
    yPosN = -1,
    relevo = true,
  } = props;

  /** ---------------------------
   *  RESOLUÇÃO BD vs LEGACY
   *  --------------------------- */

  const schema = viewerSchema ?? {};

  const resolvedBaseStl =
    schema.base_geometry?.stl ??
    baseStlUrl ??
    null;

  const textEnabled =
    schema.text?.enabled ?? (nome !== '' || telefone !== '');

  const frontText =
    schema.text?.front
      ? String(valores[schema.text.front.source] ?? '')
      : nome;

  const backText =
    schema.text?.back
      ? String(valores[schema.text.back.source] ?? '')
      : telefone;

  /* ---------------------------
     REFS THREE
  --------------------------- */

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

  /* =========================================================
     INIT THREE + STL
  ========================================================= */

  useEffect(() => {
    if (!mountRef.current) return;

    let disposed = false;
    let animationId = 0;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );
      const { STLLoader } = await import(
        'three/examples/jsm/loaders/STLLoader.js'
      );

      THREERef.current = THREE;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#020617');

      const w = mountRef.current!.clientWidth;
      const h = mountRef.current!.clientHeight;

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
      camera.position.set(0, 0, schema.camera?.distance ?? 120);

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

      /* -------- STL BASE -------- */
      if (resolvedBaseStl) {
        const loader = new STLLoader();
        loader.load(
          resolvedBaseStl,
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

            if (loadedFontRef.current) rebuildText();
          },
          undefined,
          (err: any) => console.error('Erro STLLoader:', err)
        );
      }

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
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [resolvedBaseStl]);

  /* =========================================================
     FONTS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    if (!textEnabled) return;

    (async () => {
      const { FontLoader } = await import(
        'three/examples/jsm/loaders/FontLoader.js'
      );
      const { TextGeometry } = await import(
        'three/examples/jsm/geometries/TextGeometry.js'
      );

      TextGeometryRef.current = TextGeometry;

      const loader = new FontLoader();
      const candidates = fontCandidates(
        schema.text?.fonts?.default ?? font
      );

      const tryLoad = (i: number) => {
        if (i >= candidates.length) return;
        loader.load(
          candidates[i],
          (f: any) => {
            if (cancelled) return;
            loadedFontRef.current = f;
            rebuildText();
          },
          undefined,
          () => tryLoad(i + 1)
        );
      };

      tryLoad(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [font, textEnabled]);

  /* =========================================================
     TEXTO
  ========================================================= */

  useEffect(() => {
    rebuildText();
  }, [frontText, backText, textEnabled]);

  function rebuildText() {
    if (!textEnabled) return;

    const scene = sceneRef.current;
    const THREE = THREERef.current;
    const TextGeometry = TextGeometryRef.current;
    const loadedFont = loadedFontRef.current;
    if (!scene || !THREE || !TextGeometry || !loadedFont) return;

    if (textGroupRef.current) {
      scene.remove(textGroupRef.current);
      textGroupRef.current = null;
    }

    const group = new THREE.Group();

    const zFront = zFrontRef.current || 0;

    const centerXY = (geo: any) => {
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
    };

    if (frontText) {
      const geo = new TextGeometry(frontText, {
        font: loadedFont,
        size: fontSize,
        depth: relevo ? 1.2 : 0.3,
        curveSegments: 8,
      });
      centerXY(geo);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      mesh.position.set(xPos, yPos, zFront + 0.08);
      group.add(mesh);
    }

    if (backText) {
      const shapes = loadedFont.generateShapes(backText, fontSizeN);
      const geo = new THREE.ShapeGeometry(shapes);
      centerXY(geo);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      mesh.rotation.y = Math.PI;
      mesh.position.set(xPosN, yPosN, -(zFront + 0.05));
      group.add(mesh);
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