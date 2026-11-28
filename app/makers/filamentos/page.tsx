import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { eur, prazoEntrega } from '@/lib/loja';
import { fetchFilamentos, getViewer, getPrazoConfig, type FilamentoCard } from '@/lib/loja-server';
import BannerSlot from '@/components/loja/BannerSlot';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Filamentos — Área de Makers',
  robots: { index: false, follow: false },
};

function precoDesde(f: FilamentoCard): { cents: number; promo: boolean } {
  const base = f.preco_promo_cents ?? f.preco_cents;
  const overrides = f.prod_loja_variantes.filter(v => v.ativo && v.preco_cents != null).map(v => v.preco_cents as number);
  const min = overrides.length ? Math.min(base, ...overrides) : base;
  return { cents: min, promo: f.preco_promo_cents != null };
}

function stockTotal(f: FilamentoCard): number {
  const vs = f.prod_loja_variantes.filter(v => v.ativo);
  return vs.length ? vs.reduce((a, v) => a + (v.stock ?? 0), 0) : f.stock ?? 0;
}

export default async function FilamentosPage({ searchParams }: { searchParams: Promise<{ marca?: string; material?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login?redirect=/makers/filamentos');

  // Conta sem perfil maker: explica como ter acesso (a RLS devolveria uma lista vazia de qualquer forma).
  if (!viewer.isMaker && !viewer.isAdmin) {
    return (
      <main style={{ background: '#080c10', minHeight: '100vh' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#34d399', marginBottom: 14 }}>Exclusivo makers</p>
          <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, color: '#f1f5f9', margin: '0 0 14px' }}>Os filamentos são só para makers</h1>
          <p style={{ fontSize: 16, color: '#8a96aa', lineHeight: 1.7, margin: '0 0 28px' }}>
            Se tens impressora 3D, muda o tipo da tua conta para <strong style={{ color: '#cbd5e1' }}>maker</strong> e passas a ter acesso aos filamentos e aos designs para descarregar.
          </p>
          <Link href="/bem-vindo" style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Sou maker</Link>
        </div>
      </main>
    );
  }

  const { marca, material } = await searchParams;
  const [{ filamentos, marcas }, prazoCfg] = await Promise.all([fetchFilamentos(), getPrazoConfig()]);

  const materiais = [...new Set(filamentos.map(f => f.prod_loja_filamento_detalhes?.material).filter((m): m is string => !!m))].sort();
  const lista = filamentos.filter(f =>
    (!marca || f.prod_loja_filamento_detalhes?.prod_loja_marcas?.slug === marca) &&
    (!material || f.prod_loja_filamento_detalhes?.material === material),
  );

  const qs = (patch: { marca?: string | null; material?: string | null }) => {
    const p = new URLSearchParams();
    const m = patch.marca === undefined ? marca : patch.marca;
    const mt = patch.material === undefined ? material : patch.material;
    if (m) p.set('marca', m);
    if (mt) p.set('material', mt);
    const s = p.toString();
    return s ? `/makers/filamentos?${s}` : '/makers/filamentos';
  };

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 28px' }}>
        <nav aria-label="breadcrumb" style={{ fontSize: 13, color: '#8a96aa', marginBottom: 18 }}>
          <Link href="/makers" style={{ color: '#8a96aa', textDecoration: 'none' }}>Área de Makers</Link>
          {' / '}<span style={{ color: '#e2e8f0' }}>Filamentos</span>
        </nav>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#34d399', marginBottom: 12 }}>Exclusivo makers</p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          Filamentos <span style={{ color: '#3b82f6' }}>para a tua impressora</span>
        </h1>
        <p style={{ fontSize: 16, color: '#8a96aa', maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
          Revenda oficial das marcas com que trabalhamos. Compra junto com as tuas peças e designs.
        </p>

        {(marcas.length > 1 || materiais.length > 1) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
            {marcas.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={filtroLabel}>Marca</span>
                <Chip href={qs({ marca: null })} label="Todas" active={!marca} />
                {marcas.map(m => <Chip key={m.id} href={qs({ marca: m.slug })} label={m.nome} active={marca === m.slug} />)}
              </div>
            )}
            {materiais.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={filtroLabel}>Material</span>
                <Chip href={qs({ material: null })} label="Todos" active={!material} />
                {materiais.map(m => <Chip key={m} href={qs({ material: m })} label={m} active={material === m} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <BannerSlot posicao="topo_filamentos" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22 }}>
        {lista.length === 0 ? (
          <p style={{ color: '#8a96aa', gridColumn: '1/-1' }}>
            {filamentos.length === 0 ? 'Os filamentos estão a chegar — volta em breve.' : 'Nenhum filamento com estes filtros.'}
          </p>
        ) : lista.map(f => {
          const foto = [...f.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem)[0]?.url;
          const det = f.prod_loja_filamento_detalhes;
          const cores = f.prod_loja_variantes.filter(v => v.ativo).sort((a, b) => a.ordem - b.ordem);
          const preco = precoDesde(f);
          const prazo = prazoEntrega({ stockTotal: stockTotal(f), sobEncomenda: f.sob_encomenda }, prazoCfg);
          return (
            <Link key={f.id} href={`/produto/${f.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '1', background: '#0a1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {foto
                  ? <Image src={foto} alt={f.nome} fill sizes="(max-width: 640px) 50vw, 300px" style={{ objectFit: 'cover' }} />
                  : <span style={{ fontSize: 40, opacity: 0.3 }}>🧵</span>}
                {det?.material && (
                  <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: 'rgba(8,12,16,0.8)', color: '#e2e8f0' }}>{det.material}</span>
                )}
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {det?.prod_loja_marcas && <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa' }}>{det.prod_loja_marcas.nome}</span>}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{f.nome}</h3>
                {det && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {Number(det.diametro_mm).toFixed(2)} mm · {det.peso_liquido_g >= 1000 ? `${(det.peso_liquido_g / 1000).toLocaleString('pt-PT')} kg` : `${det.peso_liquido_g} g`}
                  </span>
                )}
                {cores.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {cores.slice(0, 12).map((c, i) => (
                      <span key={i} title={c.cor ?? ''} style={{ width: 16, height: 16, borderRadius: '50%', background: c.cor_hex ?? '#334155', border: '1px solid #334155', opacity: c.stock > 0 || f.sob_encomenda ? 1 : 0.35 }} />
                    ))}
                    {cores.length > 12 && <span style={{ fontSize: 11, color: '#8a96aa' }}>+{cores.length - 12}</span>}
                  </div>
                )}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: preco.promo ? '#34d399' : '#f1f5f9' }}>
                    {cores.some(c => c.preco_cents != null) && <span style={{ fontSize: 11, fontWeight: 600, color: '#8a96aa' }}>desde </span>}
                    {eur(preco.cents)}
                  </span>
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

const filtroLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a96aa', minWidth: 64 };

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none',
      background: active ? '#3b82f6' : '#0f172a', color: active ? '#fff' : '#94a3b8',
      border: `1px solid ${active ? '#3b82f6' : '#1e293b'}`,
    }}>{label}</Link>
  );
}
