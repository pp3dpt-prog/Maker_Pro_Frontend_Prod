'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Utilizador {
  id: string;
  email: string;
  role: string | null;
  tipo_utilizador: string | null;
  plano: string | null;
  created_at: string;
}

const TIPOS: { value: string; label: string }[] = [
  { value: '', label: '— Sem tipo —' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'maker', label: 'Maker' },
  { value: 'ambos', label: 'Ambos' },
  { value: 'revendedor', label: 'Parceiro / Revendedor' },
];

function TipoBadge({ tipo }: { tipo: string | null }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    consumidor: { label: 'Consumidor', bg: '#1e3a5f', color: '#93c5fd' },
    maker: { label: 'Maker', bg: '#14532d', color: '#86efac' },
    ambos: { label: 'Ambos', bg: '#3b1f5e', color: '#d8b4fe' },
    revendedor: { label: 'Parceiro/Revendedor', bg: '#713f12', color: '#fde68a' },
  };
  const b = tipo ? map[tipo] : null;
  if (!b) return <span style={{ color: '#475569', fontSize: 12, fontStyle: 'italic' }}>sem tipo</span>;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {b.label}
    </span>
  );
}

function LinhaUtilizador({ u, onChanged }: { u: Utilizador; onChanged: () => void }) {
  const [tipo, setTipo] = useState(u.tipo_utilizador ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle');

  const alterado = tipo !== (u.tipo_utilizador ?? '');

  async function guardar() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/utilizadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id, tipo_utilizador: tipo || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro');
      setStatus('ok');
      onChanged();
    } catch {
      setStatus('erro');
    }
  }

  return (
    <tr style={{ borderBottom: '1px solid #1e293b' }}>
      <td style={{ padding: '12px 16px', color: '#f1f5f9', fontSize: 14 }}>
        {u.email}
        {u.role === 'admin' && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b' }}>★ admin</span>}
      </td>
      <td style={{ padding: '12px 16px' }}><TipoBadge tipo={u.tipo_utilizador} /></td>
      <td style={{ padding: '12px 16px' }}>
        <select
          value={tipo}
          onChange={e => { setTipo(e.target.value); setStatus('idle'); }}
          style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }}
        >
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <button
          onClick={guardar}
          disabled={!alterado || status === 'loading'}
          style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700,
            background: alterado ? '#2563eb' : '#1e293b',
            color: alterado ? 'white' : '#475569',
            cursor: alterado ? 'pointer' : 'not-allowed',
          }}
        >
          {status === 'loading' ? 'A guardar…' : status === 'ok' ? '✓ Guardado' : 'Guardar'}
        </button>
        {status === 'erro' && <p style={{ margin: '4px 0 0', color: '#f87171', fontSize: 12 }}>Erro ao guardar.</p>}
      </td>
    </tr>
  );
}

export default function AdminUtilizadoresPage() {
  const [q, setQ] = useState('');
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  async function fetchUtilizadores() {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`/api/admin/utilizadores?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
      setUtilizadores(json.utilizadores ?? []);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUtilizadores(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Utilizadores</h1>
            <p style={{ margin: '4px 0 0', color: '#8a96aa', fontSize: 14 }}>
              Procura por email e muda o tipo de conta. É aqui que se atribui o perfil <strong style={{ color: '#fde68a' }}>Parceiro/Revendedor</strong> — personaliza peças mas não compra nem descarrega, só pode pedir proposta por email.
            </p>
          </div>
          <Link href="/admin" style={{ color: '#8a96aa', fontSize: 13, textDecoration: 'none' }}>← Painel admin</Link>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); fetchUtilizadores(); }}
          style={{ display: 'flex', gap: 10, marginBottom: 20 }}
        >
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Procurar por email…"
            style={{ flex: 1, padding: '10px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#cbd5e1', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Procurar
          </button>
        </form>

        {erro && (
          <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#fca5a5', fontSize: 14 }}>
            {erro}
          </div>
        )}

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1120', borderBottom: '1px solid #1e293b' }}>
                {['Email', 'Tipo atual', 'Alterar para', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '48px 20px', textAlign: 'center', color: '#8a96aa' }}>A carregar…</td></tr>
              ) : utilizadores.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '48px 20px', textAlign: 'center', color: '#8a96aa', fontStyle: 'italic' }}>Sem resultados.</td></tr>
              ) : (
                utilizadores.map(u => <LinhaUtilizador key={u.id} u={u} onChanged={fetchUtilizadores} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
