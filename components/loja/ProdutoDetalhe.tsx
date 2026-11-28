'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { eur, prazoEntrega, DISCORD_URL, type PrazoConfig } from '@/lib/loja';
import type { ProdutoDetalhe as Produto, ProdutoVariante, Parceiro } from '@/lib/loja-server';
import { useCart } from '@/components/loja/CartContext';
import ParceirosSecao from '@/components/loja/ParceirosSecao';
import ParceriaCTA from '@/components/loja/ParceriaCTA';

function varianteLabel(v: ProdutoVariante): string {
  return [v.cor, v.cor_secundaria, v.cor_terciaria, v.tamanho].filter(Boolean).join(' / ') || 'Variante';
}

export default function ProdutoDetalhe({
  produto, ocultarPrecos, prazoCfg, parceiros = [],
}: {
  produto: Produto;
  ocultarPrecos: boolean;
  prazoCfg: PrazoConfig;
  parceiros?: Parceiro[];
}) {
  const fotos = useMemo(() => [...produto.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem), [produto]);
  const variantes = useMemo(() => [...produto.prod_loja_variantes].filter(v => v.ativo).sort((a, b) => a.ordem - b.ordem), [produto]);
  const temVariantes = variantes.length > 0;

  const [fotoSel, setFotoSel] = useState(0);
  const [varId, setVarId] = useState<string>(temVariantes ? variantes[0].id : '');
  const [msg, setMsg] = useState('');
  const { addItem, isLogged } = useCart();
  const router = useRouter();

  const varSel = variantes.find(v => v.id === varId) ?? null;
  const isFilamento = produto.tipo === 'filamento';
  const fil = produto.prod_loja_filamento_detalhes;

  // Preço efetivo: override da variante > promo > base
  const precoBase = produto.preco_promo_cents ?? produto.preco_cents;
  const precoEfetivo = varSel?.preco_cents ?? precoBase;
  const temPromo = produto.preco_promo_cents != null && varSel?.preco_cents == null;

  // Stock para o prazo
  const stockParaPrazo = temVariantes
    ? (varSel?.stock ?? variantes.reduce((a, v) => a + v.stock, 0))
    : produto.stock;
  const prazo = prazoEntrega({ stockTotal: stockParaPrazo, sobEncomenda: produto.sob_encomenda }, prazoCfg);

  const semStock = temVariantes ? (varSel ? varSel.stock <= 0 : true) : produto.stock <= 0;

  function adicionar() {
    if (!isLogged) {
      router.push(`/login?redirect=${encodeURIComponent(`/produto/${produto.slug}`)}`);
      return;
    }
    addItem({
      produto_id: produto.id,
      slug: produto.slug,
      nome: produto.nome,
      foto: fotos[0]?.url ?? null,
      variante_id: varSel?.id ?? null,
      variante_label: varSel ? varianteLabel(varSel) : null,
      preco_cents: produto.requer_orcamento ? null : precoEfetivo,
      requer_orcamento: produto.requer_orcamento,
      personalizacao: null,
      personalizacao_label: null,
    });
    setMsg('Adicionado ao carrinho ✓');
    setTimeout(() => setMsg(''), 2500);
  }

  function partilhar() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: produto.nome, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      setMsg('Link copiado!');
      setTimeout(() => setMsg(''), 2000);
    }
  }

  const shareUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 80px' }}>
        <Link href={isFilamento ? '/makers/filamentos' : '/loja'} style={{ color: '#3b82f6', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          {isFilamento ? '← Voltar aos filamentos' : '← Voltar à loja'}
        </Link>

        {produto.estado !== 'ativo' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '8px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>
              {produto.estado === 'rascunho' ? '✏️ Rascunho' : '🚫 Inativo'} — só visível para ti como admin
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, marginTop: 24 }}>
          {/* Galeria */}
          <div>
            <div style={{ position: 'relative', aspectRatio: '1', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fotos[fotoSel]
                ? <Image src={fotos[fotoSel].url} alt={fotos[fotoSel].alt ?? produto.nome} fill priority sizes="(max-width: 720px) 100vw, 480px" style={{ objectFit: 'cover' }} />
                : <span style={{ fontSize: 64, opacity: 0.3 }}>📦</span>}
            </div>
            {fotos.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {fotos.map((f, i) => (
                  <button key={f.id} onClick={() => setFotoSel(i)} style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: i === fotoSel ? '2px solid #3b82f6' : '1px solid #1e293b', padding: 0, cursor: 'pointer', background: '#0a1120' }}>
                    <Image src={f.url} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {produto.prod_loja_categorias && (
              <Link href={`/loja/${produto.prod_loja_categorias.slug}`} style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3b82f6', textDecoration: 'none' }}>
                {produto.prod_loja_categorias.nome}
              </Link>
            )}
            {isFilamento && (
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34d399' }}>
                Filamento · Exclusivo makers{fil?.prod_loja_marcas ? ` · ${fil.prod_loja_marcas.nome}` : ''}
              </span>
            )}
            <h1 style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em', margin: '8px 0 14px' }}>{produto.nome}</h1>

            {/* Prazo */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, marginBottom: 18, background: prazo.tipo === 'stock' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${prazo.tipo === 'stock' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: prazo.tipo === 'stock' ? '#34d399' : '#fbbf24' }}>{prazo.label}</span>
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>Envio em {prazo.dias}</span>
            </div>

            {produto.descricao && <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 22px' }}>{produto.descricao}</p>}

            {/* Especificações do filamento */}
            {isFilamento && fil && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 22 }}>
                <Spec label="Material" valor={fil.material} />
                <Spec label="Diâmetro" valor={`${Number(fil.diametro_mm).toFixed(2)} mm`} />
                <Spec label="Peso líquido" valor={fil.peso_liquido_g >= 1000 ? `${(fil.peso_liquido_g / 1000).toLocaleString('pt-PT')} kg` : `${fil.peso_liquido_g} g`} />
                {fil.temp_bico_min != null && <Spec label="Bico" valor={`${fil.temp_bico_min}${fil.temp_bico_max ? `–${fil.temp_bico_max}` : ''} °C`} />}
                {fil.temp_mesa_min != null && <Spec label="Mesa" valor={`${fil.temp_mesa_min}${fil.temp_mesa_max ? `–${fil.temp_mesa_max}` : ''} °C`} />}
                {fil.ficha_tecnica_url && (
                  <a href={fil.ficha_tecnica_url} target="_blank" rel="noopener noreferrer" style={{ ...specBox, textDecoration: 'none', color: '#60a5fa', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    Ficha técnica ↗
                  </a>
                )}
              </div>
            )}

            {isFilamento && fil?.notas && (
              <p style={{ fontSize: 13, color: '#cbd5e1', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '10px 14px', margin: '-8px 0 22px' }}>💡 {fil.notas}</p>
            )}

            {/* Cores do filamento (amostras) */}
            {isFilamento && temVariantes && (
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 10 }}>
                  Cor: <span style={{ color: '#f1f5f9' }}>{varSel?.cor ?? '—'}</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {variantes.map(v => {
                    const esgotado = v.stock <= 0 && !produto.sob_encomenda;
                    const sel = v.id === varId;
                    return (
                      <button key={v.id} type="button" title={`${v.cor ?? 'Cor'}${esgotado ? ' — esgotado' : ''}`}
                        onClick={() => !esgotado && setVarId(v.id)} disabled={esgotado}
                        style={{
                          width: 38, height: 38, borderRadius: '50%', cursor: esgotado ? 'not-allowed' : 'pointer',
                          background: v.cor_hex ?? '#334155', opacity: esgotado ? 0.35 : 1,
                          border: sel ? '3px solid #3b82f6' : '2px solid #1e293b',
                          boxShadow: sel ? '0 0 0 2px #080c10 inset' : 'none',
                        }} />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variantes */}
            {temVariantes && !isFilamento && (
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 8 }}>
                  {produto.tres_cores ? 'Cor base / Cor secundária / Cor terciária / Tamanho' : produto.duas_cores ? 'Cor base / Cor secundária / Tamanho' : 'Opção'}
                </label>
                <select value={varId} onChange={e => setVarId(e.target.value)} style={{ width: '100%', maxWidth: 360, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px', color: '#f1f5f9', fontSize: 15, outline: 'none' }}>
                  {variantes.map(v => (
                    <option key={v.id} value={v.id} disabled={v.stock <= 0 && !produto.sob_encomenda}>
                      {varianteLabel(v)}{v.stock <= 0 && !produto.sob_encomenda ? ' — esgotado' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preço OU mensagem maker */}
            {ocultarPrecos ? (
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 14, padding: 20, marginBottom: 22 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#c4b5fd', margin: '0 0 6px' }}>Preços não disponíveis para makers</p>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.6 }}>
                  Para condições e encomendas, fala connosco diretamente no Discord ou abre um ticket de Suporte (ícone no topo).
                </p>
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '10px 18px', background: '#5865F2', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Falar no Discord
                </a>
              </div>
            ) : produto.requer_orcamento ? (
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24' }}>Sob orçamento</span>
                </div>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }}>
                  Esta peça é orçamentada (o tamanho pode variar). Adiciona ao carrinho — o <strong style={{ color: '#cbd5e1' }}>valor final é confirmado antes do pagamento</strong>.
                </p>
                <button onClick={adicionar} style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Adicionar ao carrinho (a orçamentar)
                </button>
                {msg && <p style={{ fontSize: 13, color: '#34d399', margin: '10px 0 0' }}>{msg}</p>}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: temPromo ? '#34d399' : '#f1f5f9' }}>{eur(precoEfetivo)}</span>
                  {temPromo && <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#8a96aa' }}>{eur(produto.preco_cents)}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <button
                    onClick={adicionar}
                    disabled={semStock && !produto.sob_encomenda}
                    style={{ padding: '14px 28px', background: (semStock && !produto.sob_encomenda) ? '#1e293b' : '#2563eb', color: (semStock && !produto.sob_encomenda) ? '#64748b' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: (semStock && !produto.sob_encomenda) ? 'not-allowed' : 'pointer' }}>
                    {(semStock && !produto.sob_encomenda) ? 'Esgotado' : 'Adicionar ao carrinho'}
                  </button>
                </div>
                {msg && <p style={{ fontSize: 13, color: '#34d399', margin: '4px 0 0' }}>{msg}</p>}
              </>
            )}

            {/* Personalizador */}
            {produto.permite_personalizar && produto.design_id && (
              <Link href={`/customizador?id=${produto.design_id}&produto=${produto.slug}`} style={{ display: 'inline-block', marginTop: 14, padding: '12px 22px', background: 'transparent', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                ✨ Personalizar este produto
              </Link>
            )}

            {/* Partilha (não nos filamentos: são só para makers) */}
            {!isFilamento && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: 13, color: '#8a96aa' }}>Partilhar:</span>
              <button onClick={partilhar} style={shareBtn}>🔗 Partilhar</button>
              <a href={`https://wa.me/?text=${shareUrl}`} target="_blank" rel="noopener noreferrer" style={shareBtn}>WhatsApp</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" style={shareBtn}>Facebook</a>
            </div>}
          </div>
        </div>

        {!isFilamento && <ParceirosSecao parceiros={parceiros} />}
        {!isFilamento && <ParceriaCTA produtoSlug={produto.slug} produtoNome={produto.nome} />}
      </div>
    </main>
  );
}

const specBox: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 14px',
};

function Spec({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={specBox}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{valor}</div>
    </div>
  );
}

const shareBtn: React.CSSProperties = {
  padding: '7px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
  color: '#cbd5e1', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
};
