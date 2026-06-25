import Link from 'next/link';
import { eur, prazoEntrega, type PrazoConfig } from '@/lib/loja';
import type { CatalogoProduto, CatalogoCategoria } from '@/lib/loja-server';

function stockTotal(p: CatalogoProduto): number {
  if (p.prod_loja_variantes && p.prod_loja_variantes.length > 0) {
    return p.prod_loja_variantes.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }
  return p.stock ?? 0;
}

function primeiraFoto(p: CatalogoProduto): string | null {
  if (!p.prod_loja_imagens || p.prod_loja_imagens.length === 0) return null;
  return [...p.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem)[0].url;
}

export default function StoreCatalog({
  categorias, produtos, categoriaAtual, ocultarPrecos, prazoCfg,
}: {
  categorias: CatalogoCategoria[];
  produtos: CatalogoProduto[];
  categoriaAtual: CatalogoCategoria | null;
  ocultarPrecos: boolean;
  prazoCfg: PrazoConfig;
}) {
  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 28px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Loja PP3D</p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          {categoriaAtual ? categoriaAtual.nome : <>Produtos <span style={{ color: '#3b82f6' }}>impressos em 3D</span></>}
        </h1>
        <p style={{ fontSize: 16, color: '#8a96aa', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          Peças prontas e personalizáveis. Recebe em casa — ou personaliza ao teu gosto.
        </p>

        {/* Chips de categoria */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
          <Chip href="/loja" label="Todos" active={!categoriaAtual} />
          {categorias.map(c => (
            <Chip key={c.id} href={`/loja/${c.slug}`} label={c.nome} active={categoriaAtual?.id === c.id} />
          ))}
        </div>
      </div>

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22,
      }}>
        {produtos.length === 0 ? (
          <p style={{ color: '#8a96aa', gridColumn: '1/-1' }}>Sem produtos nesta categoria.</p>
        ) : produtos.map(p => {
          const foto = primeiraFoto(p);
          const st = stockTotal(p);
          const prazo = prazoEntrega({ stockTotal: st, sobEncomenda: p.sob_encomenda }, prazoCfg);
          const temPromo = p.preco_promo_cents != null;
          return (
            <Link key={p.id} href={`/produto/${p.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '1', background: '#0a1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {foto
                  ? <img src={foto} alt={p.nome} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>}
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{p.nome}</h3>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  {ocultarPrecos ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>Preço sob consulta</span>
                  ) : p.requer_orcamento ? (
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>Sob orçamento</span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: temPromo ? '#34d399' : '#f1f5f9' }}>{eur(temPromo ? p.preco_promo_cents : p.preco_cents)}</span>
                      {temPromo && <span style={{ fontSize: 12, textDecoration: 'line-through', color: '#828fa3' }}>{eur(p.preco_cents)}</span>}
                    </span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: prazo.tipo === 'stock' ? '#34d399' : '#fbbf24' }}>{prazo.label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none',
      background: active ? '#3b82f6' : '#0f172a',
      color: active ? '#fff' : '#94a3b8',
      border: `1px solid ${active ? '#3b82f6' : '#1e293b'}`,
    }}>{label}</Link>
  );
}
