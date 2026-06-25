'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, estadoBadge, eur, prazoEntrega, PRAZO_DEFAULT, type PrazoConfig } from './_ui';

interface Variante { stock: number; ativo: boolean; }
interface Produto {
  id: string;
  nome: string;
  slug: string;
  preco_cents: number;
  preco_promo_cents: number | null;
  stock: number;
  sob_encomenda: boolean;
  estado: string;
  prod_loja_categorias: { nome: string } | null;
  prod_loja_variantes: Variante[];
}

function stockTotal(p: Produto): number {
  if (p.prod_loja_variantes && p.prod_loja_variantes.length > 0) {
    return p.prod_loja_variantes.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }
  return p.stock ?? 0;
}

export default function LojaAdminPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [prazoCfg, setPrazoCfg] = useState<PrazoConfig>(PRAZO_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: cfg }] = await Promise.all([
      supabase
        .from('prod_loja_produtos')
        .select('id, nome, slug, preco_cents, preco_promo_cents, stock, sob_encomenda, estado, prod_loja_categorias(nome), prod_loja_variantes(stock, ativo)')
        .order('updated_at', { ascending: false }),
      supabase.from('prod_loja_config').select('prazo_stock_min, prazo_stock_max, prazo_producao_min, prazo_producao_max').eq('id', 1).maybeSingle(),
    ]);
    if (error) setErro(error.message);
    else setProdutos((data ?? []) as unknown as Produto[]);
    if (cfg) setPrazoCfg(cfg as PrazoConfig);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProdutos(); }, [fetchProdutos]);

  async function apagar(id: string, nome: string) {
    if (!confirm(`Apagar o produto "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('prod_loja_produtos').delete().eq('id', id);
    if (error) { alert('Erro ao apagar: ' + error.message); return; }
    setProdutos(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={s.h1}>🛒 Loja — Produtos</h1>
            <p style={{ ...s.sub, margin: 0 }}>Gere produtos, stock, fotos e preços.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin" style={s.btnGhost}>← Admin</Link>
            <Link href="/admin/loja/encomendas" style={s.btnGhost}>Encomendas</Link>
            <Link href="/admin/loja/categorias" style={s.btnGhost}>Categorias</Link>
            <Link href="/admin/loja/definicoes" style={s.btnGhost}>Portes</Link>
            <Link href="/admin/loja/novo" style={{ ...s.btn, textDecoration: 'none' }}>+ Novo produto</Link>
          </div>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>Erro: {erro}</p>}

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : produtos.length === 0 ? (
          <div style={{ ...s.card, textAlign: 'center', color: '#8a96aa' }}>
            Ainda não há produtos. <Link href="/admin/loja/novo" style={{ color: '#60a5fa' }}>Cria o primeiro →</Link>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>Produto</th>
                  <th style={s.th}>Categoria</th>
                  <th style={s.th}>Preço</th>
                  <th style={s.th}>Stock</th>
                  <th style={s.th}>Entrega</th>
                  <th style={s.th}>Estado</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => {
                  const st = stockTotal(p);
                  const prazo = prazoEntrega({ stockTotal: st, sobEncomenda: p.sob_encomenda }, prazoCfg);
                  return (
                    <tr key={p.id}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{p.nome}</div>
                        <div style={{ fontSize: 12, color: '#828fa3' }}>/{p.slug}</div>
                      </td>
                      <td style={s.td}>{p.prod_loja_categorias?.nome ?? '—'}</td>
                      <td style={s.td}>
                        {p.preco_promo_cents != null ? (
                          <span><span style={{ color: '#34d399', fontWeight: 700 }}>{eur(p.preco_promo_cents)}</span>{' '}
                            <span style={{ textDecoration: 'line-through', color: '#828fa3', fontSize: 12 }}>{eur(p.preco_cents)}</span></span>
                        ) : eur(p.preco_cents)}
                      </td>
                      <td style={s.td}>
                        <span style={{ color: st === 0 ? '#f87171' : st < 5 ? '#fbbf24' : '#cbd5e1', fontWeight: 600 }}>{st}</span>
                        {p.prod_loja_variantes.length > 0 && <span style={{ fontSize: 11, color: '#828fa3' }}> ({p.prod_loja_variantes.length} var.)</span>}
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize: 12, color: prazo.tipo === 'stock' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{prazo.label}</div>
                        <div style={{ fontSize: 11, color: '#828fa3' }}>{prazo.dias}</div>
                      </td>
                      <td style={s.td}><span style={estadoBadge[p.estado] ?? estadoBadge.rascunho}>{p.estado}</span></td>
                      <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link href={`/admin/loja/${p.id}`} style={{ ...s.btnGhost, padding: '6px 12px', marginRight: 8 }}>Editar</Link>
                        <button style={s.btnDanger} onClick={() => apagar(p.id, p.nome)}>Apagar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
