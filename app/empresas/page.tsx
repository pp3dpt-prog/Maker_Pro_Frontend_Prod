import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo para Empresas',
  description: 'Produtos personalizáveis com o logótipo da tua empresa — pede proposta por peça.',
  alternates: { canonical: 'https://pp3d.pt/empresas' },
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  thumbnail_url?: string;
  estado: string;
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
            Tens uma empresa?<br /><span style={{ color: '#3b82f6' }}>Personaliza peças com o teu logótipo.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#8a96aa', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' }}>
            Acesso de parceiro/revendedor é atribuído pela nossa equipa. Carrega o teu logótipo nos
            modelos preparados para isso e pede uma proposta — sem necessidade de compra ou download direto.
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

  // ── Com acesso: só os designs escolhidos no admin (mostrar_empresas) ──
  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, nome, familia, thumbnail_url, estado')
    .eq('estado', 'ativo')
    .eq('mostrar_empresas', true);

  if (error) {
    return (
      <main style={{ padding: 40, color: 'white' }}>
        <h2>Erro ao carregar catálogo</h2>
        <p style={{ color: '#f87171' }}>{error.message}</p>
      </main>
    );
  }

  const designs = (data ?? []) as Design[];

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 40px 40px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 14 }}>
          Catálogo para Empresas
        </p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1 }}>
          Peças com o <span style={{ color: '#3b82f6' }}>teu logótipo</span>
        </h1>
        <p style={{ fontSize: 16, color: '#475569', maxWidth: 560, lineHeight: 1.65, margin: 0 }}>
          Modelos selecionados para empresas. Configura com o teu logótipo no customizador,
          envia o pedido e recebes uma proposta por email, sem compromisso de compra.
        </p>
      </div>

      {designs.length === 0 ? (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center', color: '#8a96aa' }}>
          Ainda não há modelos selecionados para este catálogo.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24, padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto' }}>
          {designs.map((design) => (
            <Link
              key={design.id}
              href={`/customizador?id=${design.id}&familia=${encodeURIComponent(design.familia)}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1', background: '#1e293b', position: 'relative' }}>
                  {design.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={design.thumbnail_url} alt={design.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'rgba(37,99,235,0.85)', color: 'white' }}>
                    Logótipo
                  </span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{design.nome}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8a96aa' }}>{design.familia}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
