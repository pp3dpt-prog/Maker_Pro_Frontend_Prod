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
  const [largura, setLargura] = useState(120);
  const [comprimento, setComprimento] = useState(80);
  const [altura, setAltura] = useState(40);
  const [espessuraParede, setEspessuraParede] = useState(2.4);
  const [espessuraFundo, setEspessuraFundo] = useState(3.0);
  const [tampa, setTampa] = useState<'nenhuma' | 'simples'>('nenhuma');

  return (
    <>
      <h3 className={styles.title}>Configuração</h3>

      <Control
        label="Largura"
        value={largura}
        unit="mm"
        min={60}
        max={300}
        step={1}
        onChange={setLargura}
      />

      <Control
        label="Comprimento"
        value={comprimento}
        unit="mm"
        min={60}
        max={300}
        step={1}
        onChange={setComprimento}
      />

      <Control
        label="Altura"
        value={altura}
        unit="mm"
        min={20}
        max={200}
        step={1}
        onChange={setAltura}
      />

      <Control
        label="Espessura da parede"
        value={espessuraParede}
        unit="mm"
        min={1.2}
        max={6}
        step={0.2}
        onChange={setEspessuraParede}
      />

      <Control
        label="Espessura do fundo"
        value={espessuraFundo}
        unit="mm"
        min={1.2}
        max={8}
        step={0.2}
        onChange={setEspessuraFundo}
      />

      <div className={styles.selectRow}>
        <label>Tampa</label>
        <select
          value={tampa}
          onChange={(e) =>
            setTampa(e.target.value as 'nenhuma' | 'simples')
          }
        >
          <option value="nenhuma">Sem tampa</option>
          <option value="simples">Tampa simples</option>
        </select>
      </div>

      <button className={styles.primaryBtn}>
        Gerar STL
      </button>
    </>
  );
}

/* Componente reutilizável para sliders */
function Control({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.control}>
      <div className={styles.controlHeader}>
        <span>{label}</span>
        <strong>
          {value} {unit}
        </strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
