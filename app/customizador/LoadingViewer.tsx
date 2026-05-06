'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Loader } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import { Mesh } from 'three';

/**
 * Viewer de loading com animação rotativa
 * Mostra enquanto STL está sendo gerado
 */
export default function LoadingViewer() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [120, 90, 120],
          fov: 45,
          near: 1,
          far: 1000,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          preserveDrawingBuffer: false,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {/* Ambiente */}
          <color attach="background" args={['#050505']} />
          <Environment preset="warehouse" />

          {/* Iluminação */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[200, 200, 100]}
            intensity={1}
            castShadow
          />
          <directionalLight
            position={[-200, 100, -100]}
            intensity={0.6}
          />

          {/* Grelha */}
          <Grid
            args={[1000, 1000]}
            cellSize={20}
            cellThickness={0.8}
            sectionSize={100}
            sectionThickness={1.2}
            fadeDistance={600}
            fadeStrength={1}
            sectionColor="#1f2937"
            cellColor="#0b0f14"
          />

          {/* Objeto em rotação */}
          <RotatingBox />

          {/* Controlo de câmara (desativado durante loading) */}
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={80}
            maxDistance={400}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>

      {/* Overlay com texto e spinner */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Spinner */}
          <div
            style={{
              width: 60,
              height: 60,
              margin: '0 auto 20px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />

          {/* Texto */}
          <h3 style={{ color: '#e0e7ff', margin: '0 0 10px 0', fontSize: '18px' }}>
            Gerando seu STL...
          </h3>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
            Por favor aguarde enquanto processamos o seu pedido
          </p>

          {/* Barra de progresso fake */}
          <div
            style={{
              marginTop: 20,
              width: 200,
              height: 4,
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                borderRadius: 4,
                animation: 'progress 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Animações CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* Objeto rotativo */
function RotatingBox() {
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.z += 0.003;
      }
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[100, 100, 100]} />
      <meshStandardMaterial
        color="#3b82f6"
        metalness={0.3}
        roughness={0.4}
        emissive="#1e40af"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
