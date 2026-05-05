'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import CustomizadorClient from './CustomizadorClient';
import styles from './ConfiguratorLayout.module.css';


export default function PageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [configOpen, setConfigOpen] = useState(false);

  if (!id) {
    return <main style={{ padding: 40 }}>Produto inválido</main>;
  }

  return (
    <main className={styles.root}>
      {/* Painel desktop */}
      <aside className="config-panel">
        <ConfigPanel />
      </aside>

      {/* Área 3D */}
      <section className="viewer-area">
        <CustomizadorClient designId={id} />

        {/* Botão mobile */}
        <button
          className="mobile-config-btn"
          onClick={() => setConfigOpen(true)}
        >
          Configurar
        </button>
      </section>

      {/* Drawer mobile */}
      {configOpen && (
        <div className="mobile-drawer">
          <button
            className="close-btn"
            onClick={() => setConfigOpen(false)}
          >
            Fechar
          </button>
          <ConfigPanel />
        </div>
      )}
    </main>
  );
}

function ConfigPanel() {
  return (
    <>
      <h3>Configuração</h3>

      <label>
        Largura
        <input type="range" />
      </label>

      <label>
        Altura
        <input type="range" />
      </label>

      <label>
        Espessura
        <input type="range" />
      </label>

      <button className="primary-btn">
        Gerar STL
      </button>
    </>
  );
}