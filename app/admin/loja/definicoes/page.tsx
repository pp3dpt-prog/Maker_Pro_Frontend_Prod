'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s } from '../_ui';

export default function DefinicoesLojaPage() {
  const [portes, setPortes] = useState('');          // em euros (string no input)
  const [gratisAcima, setGratisAcima] = useState(''); // em euros, vazio = nunca
  const [stockMin, setStockMin] = useState('1');
  const [stockMax, setStockMax] = useState('3');
  const [prodMin, setProdMin] = useState('3');
  const [prodMax, setProdMax] = useState('5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('prod_loja_config').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setPortes(((data.portes_cents ?? 0) / 100).toString());
        setGratisAcima(data.portes_gratis_acima_cents != null ? (data.portes_gratis_acima_cents / 100).toString() : '');
        setStockMin(String(data.prazo_stock_min ?? 1));
        setStockMax(String(data.prazo_stock_max ?? 3));
        setProdMin(String(data.prazo_producao_min ?? 3));
        setProdMax(String(data.prazo_producao_max ?? 5));
      }
      setLoading(false);
    })();
  }, []);

  function toCents(v: string): number | null {
    const n = parseFloat(v.replace(',', '.'));
    if (isNaN(n)) return null;
    return Math.round(n * 100);
  }

  async function guardar() {
    setSaving(true); setMsg('');
    const portesCents = toCents(portes) ?? 0;
    const gratisCents = gratisAcima.trim() === '' ? null : toCents(gratisAcima);
    const int = (v: string, d: number) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
    const { error } = await supabase.from('prod_loja_config').update({
      portes_cents: portesCents,
      portes_gratis_acima_cents: gratisCents,
      prazo_stock_min: int(stockMin, 1),
      prazo_stock_max: int(stockMax, 3),
      prazo_producao_min: int(prodMin, 3),
      prazo_producao_max: int(prodMax, 5),
    }).eq('id', 1);
    setSaving(false);
    setMsg(error ? 'Erro: ' + error.message : 'Guardado ✓');
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.wrap, maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={s.h1}>Portes de envio</h1>
          <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
        </div>

        {loading ? <p style={{ color: '#64748b' }}>A carregar…</p> : (
          <div style={s.card}>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Portes base (€)</label>
              <input style={s.input} value={portes} onChange={e => setPortes(e.target.value)} placeholder="Ex: 3.50" inputMode="decimal" />
              <p style={{ fontSize: 12, color: '#475569', margin: '6px 0 0' }}>Valor aplicado a cada encomenda (pode ser substituído por produto).</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={s.label}>Envio grátis acima de (€)</label>
              <input style={s.input} value={gratisAcima} onChange={e => setGratisAcima(e.target.value)} placeholder="Ex: 40 (vazio = nunca)" inputMode="decimal" />
              <p style={{ fontSize: 12, color: '#475569', margin: '6px 0 0' }}>Se o total da encomenda ultrapassar este valor, os portes são gratuitos.</p>
            </div>

            <div style={{ borderTop: '1px solid #1e293b', margin: '4px 0 22px', paddingTop: 22 }}>
              <label style={{ ...s.label, marginBottom: 12 }}>Prazos de entrega (dias úteis)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ ...s.label, color: '#34d399' }}>Em stock — mín / máx</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={s.input} value={stockMin} onChange={e => setStockMin(e.target.value)} inputMode="numeric" />
                    <input style={s.input} value={stockMax} onChange={e => setStockMax(e.target.value)} inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <label style={{ ...s.label, color: '#fbbf24' }}>Por produção — mín / máx</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={s.input} value={prodMin} onChange={e => setProdMin(e.target.value)} inputMode="numeric" />
                    <input style={s.input} value={prodMax} onChange={e => setProdMax(e.target.value)} inputMode="numeric" />
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 0' }}>Mostrados ao cliente conforme o produto tenha stock ou seja por produção.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button style={s.btn} onClick={guardar} disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
              {msg && <span style={{ fontSize: 13, color: msg.startsWith('Erro') ? '#f87171' : '#34d399' }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
