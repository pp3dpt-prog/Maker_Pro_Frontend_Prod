import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import FamilyCard from '@/components/cards/FamilyCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Makers',
  description: 'Área de makers PP3D — acede aos designs paramétricos, gera STL e descarrega os ficheiros.',
  alternates: { canonical: 'https://pp3d.pt/makers' },
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  thumbnail_url?: string;
  total_likes: number;
  total_downloads: number;
  estado: string;
  gratuito?: boolean;
};

type FamilyInfo = {
  count: number;
  thumbnail_url?: string;
  totalLikes: number;
  totalDownloads: number;
  designIds: string[];
  isExclusivo: boolean;
  temGratuito: boolean;
};

export default async function MakersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ── Não autenticado: landing com CTA (a área de makers exige login) ──
  if (!user) {
    return (
      <main style={{ background: '#080c10', minHeight: '100vh' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#34d399', marginBottom: 14 }}>Área de Makers</p>
          <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            Tens impressora 3D?<br /><span style={{ color: '#3b82f6' }}>Descarrega os ficheiros.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' }}>
            Acede a designs paramétricos, personaliza as medidas, gera o STL e descarrega.
            Modelos gratuitos para todos os makers e exclusivos com plano.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?redirect=/makers" style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
            <Link href="/register" style={{ padding: '14px 28px', background: 'transparent', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Criar conta grátis</Link>
          </div>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 24 }}>
            Vê os <Link href="/pricing" style={{ color: '#60a5fa' }}>planos</Link> ou volta à <Link href="/loja" style={{ color: '#60a5fa' }}>loja</Link>.
          </p>
        </div>
      </main>
    );
  }

  // ── Autenticado: perfil + créditos + catálogo ──
  const { data: perfil } = await supabase
    .from('prod_perfis')
    .select('role, tipo_utilizador, plano, downloads_limite, downloads_mes, downloads_comprados, prod_planos(nome)')
    .eq('id', user.id)
    .maybeSingle();

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = perfil?.role === 'admin'
    || (!!adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim());

  const restantes = Math.max(0, (perfil?.downloads_limite ?? 0) - (perfil?.downloads_mes ?? 0)) + (perfil?.downloads_comprados ?? 0);
  const planoNome = (perfil?.prod_planos as any)?.nome ?? perfil?.plano ?? 'Gratuito';

  // Designs: admin vê tudo; restantes veem ativos + exclusivos (bloqueados)
  let query = supabase
    .from('prod_designs')
    .select('id, nome, familia, thumbnail_url, total_likes, total_downloads, estado, gratuito');
  if (!isAdmin) query = query.in('estado', ['ativo', 'exclusivo']);

  const { data, error } = await query;
  const designs = (data ?? []) as Design[];

  const familias = designs.reduce<Record<string, FamilyInfo>>((acc, d) => {
    const fam = d.familia ?? 'geral';
    if (!acc[fam]) acc[fam] = { count: 0, thumbnail_url: d.thumbnail_url, totalLikes: 0, totalDownloads: 0, designIds: [], isExclusivo: false, temGratuito: false };
    acc[fam].count++;
    acc[fam].totalLikes += d.total_likes ?? 0;
    acc[fam].totalDownloads += d.total_downloads ?? 0;
    acc[fam].designIds.push(d.id);
    if (d.estado === 'exclusivo') acc[fam].isExclusivo = true;
    if (d.gratuito) acc[fam].temGratuito = true;
    return acc;
  }, {});

  const entries = Object.entries(familias);

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 28px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#34d399', marginBottom: 12 }}>Área de Makers</p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          Designs para <span style={{ color: '#3b82f6' }}>impressão 3D</span>
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          Personaliza, gera o STL e descarrega. Modelos gratuitos e exclusivos com plano.
        </p>

        {/* Banner de créditos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 28, padding: '18px 22px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Plano</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{planoNome}</div>
          </div>
          <div style={{ width: 1, height: 32, background: '#1e293b' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Downloads disponíveis</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: restantes > 0 ? '#34d399' : '#f87171' }}>{restantes}</div>
          </div>
          <Link href="/pricing" style={{ marginLeft: 'auto', padding: '10px 18px', background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Ver planos
          </Link>
        </div>
      </div>

      {error ? (
        <p style={{ color: '#f87171', padding: '0 32px' }}>Erro ao carregar: {error.message}</p>
      ) : (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {entries.map(([familia, info]) => {
            const bloqueado = info.isExclusivo && !isAdmin;
            return (
              <div key={familia} style={{ position: 'relative' }}>
                {bloqueado && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10, pointerEvents: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', fontSize: 12, fontWeight: 800 }}>🔒 Plano necessário</div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '0 20px' }}>Faz upgrade para aceder</p>
                  </div>
                )}
                <Link href={bloqueado ? '/pricing' : `/familia/${encodeURIComponent(familia)}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <FamilyCard
                    familia={familia}
                    modelCount={info.count}
                    thumbnail_url={info.thumbnail_url}
                    totalLikes={info.totalLikes}
                    totalDownloads={info.totalDownloads}
                    designIds={info.designIds}
                    isExclusivo={info.isExclusivo && !isAdmin}
                    isAdmin={isAdmin}
                  />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
