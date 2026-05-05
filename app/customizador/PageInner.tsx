'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import CustomizadorClient from './CustomizadorClient';
import styles from './ConfiguratorLayout.module.css';

export default function PageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [mobileOpen, setMobileOpen] = useState(false);

  if (!id) {
    return (
      <main className={styles.invalid}>
        Produto inválido
      </main>
    );
  }

  return (
    <main className={styles.root}>
      {/* Painel desktop */}
      <aside className={styles.panel}>
        <ConfigPanel />
      </aside>

      {/* Área 3D */}
      <section className={styles.viewer}>
        <CustomizadorClient designId={id} />

        {/* Botão mobile */}
        <button
          className={styles.mobileBtn}
          onClick={() => setMobileOpen(true)}
        >
          Configurar
        </button>
      </section>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <button
            className={styles.closeBtn}
            onClick={() => setMobileOpen(false)}
          >
            Fechar
          </button>
          <ConfigPanel />
        </div>
      )}
    </main>
  );
}

/* Painel de configuração reutilizável */
function ConfigPanel() {
  return (
    <>
      <h3 className={styles.title}>Configuração</h3>

      <label className={styles.label}>
        Largura
        <input type="range" />
      </label>

      <label className={styles.label}>
        Comprimento
        <input type="range" />
      </label>

      <label className={styles.label}>
        Altura
        <input type="range" />
      </label>

      <label className={styles.label}>
        Espessura
        <input type="range" />
      </label>

      <button className={styles.primaryBtn}>
        Gerar STL
      </button>
    </>
  );
}