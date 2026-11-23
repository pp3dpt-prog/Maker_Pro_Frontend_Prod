import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import FamilyCard from '@/components/cards/FamilyCard';
import { familyCoverFor } from '@/lib/familyCovers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo para Empresas',
  description: 'Catálogo de produtos personalizáveis para empresas e revendedores PP3D — pede proposta por peça.',
  alternates: { canonical: 'https://pp3d.pt/empresas' },
};

type Design = {
  id: string;
  familia: string;
  thumbnail_url?: string;
  total_likes: number;
  total_downloads: number;
  estado: string;
  capa_familia?: boolean;
};

type FamilyInfo = {
  count: number;
  thumbnail_url?: string;
  totalLikes: number;
  totalDownloads: number;
  designIds: string[];
};

const PEDIR_ACESSO_HREF =
  'mailto:pp3d.pt@gmail.com?subject=' + encodeURIComponent('Pedido de acesso — catálogo para empresas');

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tipoUtilizador: string | null = null;
  let isAdmin = false;

  if (user) {
    const { data: perfil } = await supabase
      .from('prod_perfis')
      .select('tipo_utilizador, role')
      .eq('id', user.id)
      .maybeSingle();
    tipoUtilizador = perfil?.tipo_utilizador ?? null;
    isAdmin = perfil?.role === 'admin';
  }

  const temAcesso = isAdmin || tipoUtilizador === 'revendedor';

  // ── Sem acesso: landing com explicação + pedido de acesso ──
  if (!temAcesso) {
    return (
      <main style={{ background: '#080c10', minHeight: '100vh' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 14 }}>
            Catálogo para Empresas
          </p>
          <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            Tens uma loja ou negócio?<br /><span style={{ color: '#3b82f6' }}>Revende os nossos produtos.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#8a96aa', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' }}>
            Acesso de parceiro/revendedor é atribuído pela nossa equipa. Configura a peça que precisas
            e pede uma proposta — sem necessidade de compra ou download direto.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <a href={PEDIR_ACESSO_HREF} style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                Pedir acesso como revendedor
              </a>
            ) : (
              <Link href="/login?redirect=/empresas" style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                Entrar
              </Link>
            )}
            <Link href="/produtos" style={{ padding: '14px 28px', background: 'transparent', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Ver catálogo geral
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Com acesso: catálogo completo (inclui famílias exclusivas) ──
  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, familia, thumbnail_url, total_likes, total_downloads, estado, capa_familia')
    .eq('estado', 'ativo');

  if (error) {
    return (
      <main style={{ padding: 40, color: 'white' }}>
        <h2>Erro ao carregar catálogo</h2>
        <p style={{ color: '#f87171' }}>{error.message}</p>
      </main>
    );
  }

  const designs = (data ?? []) as Design[];
  const familias = designs.reduce<Record<string, FamilyInfo>>((acc, design) => {
    const familia = design.familia ?? 'geral';
    if (!acc[familia]) {
      acc[familia] = { count: 0, thumbnail_url: undefined, totalLikes: 0, totalDownloads: 0, designIds: [] };
    }
    acc[familia].count++;
    acc[familia].totalLikes += design.total_likes ?? 0;
    acc[familia].totalDownloads += design.total_downloads ?? 0;
    acc[familia].designIds.push(design.id);
    if (!acc[familia].thumbnail_url && design.thumbnail_url) acc[familia].thumbnail_url = design.thumbnail_url;
    if (design.capa_familia && design.thumbnail_url) acc[familia].thumbnail_url = design.thumbnail_url;
    return acc;
  }, {});

  const familiaEntries = Object.entries(familias);

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 40px 40px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 14 }}>
          Catálogo para Empresas
        </p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1 }}>
          Escolhe uma peça e <span style={{ color: '#3b82f6' }}>pede proposta</span>
        </h1>
        <p style={{ fontSize: 16, color: '#475569', maxWidth: 560, lineHeight: 1.65, margin: 0 }}>
          Configura a peça no customizador e envia o pedido — recebes uma proposta por email, sem compromisso de compra.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto' }}>
        {familiaEntries.map(([familia, info]) => (
          <Link key={familia} href={`/familia/${encodeURIComponent(familia)}`} style={{ textDecoration: 'none', display: 'block' }}>
            <FamilyCard
              familia={familia}
              modelCount={info.count}
              thumbnail_url={familyCoverFor(familia, info.thumbnail_url)}
              totalLikes={info.totalLikes}
              totalDownloads={info.totalDownloads}
              designIds={info.designIds}
              isExclusivo={false}
              isAdmin={isAdmin}
            />
          </Link>
        ))}
      </div>
    </main>
  );
}
