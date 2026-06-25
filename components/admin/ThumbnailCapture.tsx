'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

type Props = {
  stlUrl: string;
  designId: string;
  onCaptured: (url: string) => void;
  onError: (err: string) => void;
};

export default function ThumbnailCapture({ stlUrl, designId, onCaptured, onError }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'rendering' | 'capturing' | 'done' | 'error'>('loading');

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const W = 400, H = 300;
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100000);
    camera.up.set(0, 0, 1);

    // preserveDrawingBuffer é essencial para toDataURL funcionar
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(2); // alta resolução
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 10);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const loader = new STLLoader();
    setStatus('loading');

    loader.load(stlUrl, (geometry: THREE.BufferGeometry) => {
      setStatus('rendering');
      geometry.computeBoundingBox();
      const box    = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size   = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      geometry.translate(-center.x, -center.y, -center.z);

      const material = new THREE.MeshPhongMaterial({ color: 0x93c5fd, specular: 0x222222, shininess: 60 });
      const mesh     = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Posição isométrica apelativa
      const dist = maxDim * 2.2;
      camera.position.set(dist * 0.7, -dist * 0.8, dist * 0.6);
      camera.lookAt(0, 0, 0);
      controls.update();

      // Renderizar alguns frames para estabilizar
      let frames = 0;
      const animate = () => {
        frames++;
        controls.update();
        renderer.render(scene, camera);

        if (frames < 10) {
          requestAnimationFrame(animate);
        } else {
          // Capturar screenshot
          setStatus('capturing');
          setTimeout(async () => {
            try {
              renderer.render(scene, camera);
              const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.92);

              const res = await fetch('/api/admin/thumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ design_id: designId, image_base64: dataUrl }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);

              setStatus('done');
              onCaptured(json.url);
            } catch (e: any) {
              setStatus('error');
              onError(e.message);
            } finally {
              renderer.dispose();
              geometry.dispose();
              material.dispose();
            }
          }, 100);
        }
      };
      animate();
    },
    undefined,
    (err: unknown) => {
      console.error('[ThumbnailCapture] erro:', err);
      setStatus('error');
      onError('Erro ao carregar STL');
    });

    return () => {
      renderer.dispose();
    };
  }, [stlUrl, designId]);

  return (
    <div style={{ position: 'relative', width: 400, height: 300, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div ref={canvasRef} style={{ width: 400, height: 300 }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,12,16,0.6)', pointerEvents: 'none',
        opacity: status === 'done' ? 0 : 1, transition: 'opacity 0.5s',
      }}>
        <p style={{ color: '#8a96aa', fontSize: 13 }}>
          {status === 'loading'    ? '⏳ A carregar STL…'     :
           status === 'rendering'  ? '🎨 A renderizar…'       :
           status === 'capturing'  ? '📸 A capturar imagem…'  :
           status === 'error'      ? '❌ Erro'                 : '✅'}
        </p>
      </div>
    </div>
  );
}
