import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FamilyCard from '@/components/cards/FamilyCard';

export const dynamic = 'force-dynamic';

type Design = {
  id: string;
  nome: string;
  descricao: string;
  familia: string;
  preco_creditos: number;
  tags?: string[];
  thumbnail_url?: string;
  total_likes: number;
  total_downloads: number;
  estado: string;
  familia_estado: string;
  plano_minimo: string | null;
};

type FamilyInfo = {
  count: number;
  thumbnail_url?: string;
  totalLikes: number;
  totalDownloads: number;
  designIds: string[];
  estado: string; // estado da família (do primeiro design)
  plano_minimo: string | null;
  isExclusivo: boolean;
};

export default async function Page() {
  const supabase = await createClient();

  // Verificar utilizador e perfil
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = null;
  let userPlano = null;

  if (user) {
    const { data: perfil } = await supabase
      .from('prod_perfis')
      .select('role, plano_id, prod_planos(nome)')
      .eq('id', user.id)
      .maybeSingle();

    userRole = perfil?.role ?? null;
    userPlano = (perfil?.prod_planos as any)?.nome ?? null;
  }

  const isAdmin = userRole === 'admin';

  // Buscar designs conforme o role
  let query = supabase
    .from('prod_designs')
    .select('id, nome, descricao, familia, preco_creditos, tags, thumbnail_url, total_likes, total_downloads, estado, familia_estado, plano_minimo');

  // Admin vê tudo, utilizadores normais não veem rascunhos/inativos
  if (!isAdmin) {
    query = query
      .neq('estado', 'inativo')
      .neq('estado', 'rascunho')
      .neq('familia_estado', 'inativo')
      .neq('familia_estado', 'rascunho');
  }

  const { data, error } = await query;

  if (error) {
    return (
      <main style={{ padding: 40, color: 'white' }}>
        <h2>Erro ao carregar catálogo</h2>
        <p style={{ color: '#f87171' }}>{error.message}</p>
      </main>
    );
  }

  const designs = (data ?? []) as Design[];

  // Agrupar por família
  const familias = designs.reduce<Record<string, FamilyInfo>>(
    (acc, design) => {
      const familia = design.familia ?? 'geral';
      if (!acc[familia]) {
        acc[familia] = {
          count: 0,
          thumbnail_url: design.thumbnail_url,
          totalLikes: 0,
          totalDownloads: 0,
          designIds: [],
          estado: design.familia_estado,
          plano_minimo: design.plano_minimo,
          isExclusivo: design.familia_estado === 'exclusivo' || design.estado === 'exclusivo',
        };
      }
      acc[familia].count++;
      acc[familia].totalLikes += design.total_likes ?? 0;
      acc[familia].totalDownloads += design.total_downloads ?? 0;
      acc[familia].designIds.push(design.id);

      // Se qualquer design da família for exclusivo, a família é exclusiva
      if (design.estado === 'exclusivo' || design.familia_estado === 'exclusivo') {
        acc[familia].isExclusivo = true;
      }

      // Plano mínimo mais restritivo
      if (design.plano_minimo && !acc[familia].plano_minimo) {
        acc[familia].plano_minimo = design.plano_minimo;
      }

      return acc;
    },
    {}
  );

  const familiaEntries = Object.entries(familias);
  const totalModelos = designs.length;

  // Verificar se o utilizador tem acesso a um plano
  const temAcesso = (planoMinimo: string | null) => {
    if (!planoMinimo) return true;
    if (isAdmin) return true;
    if (!userPlano) return false;
    // Hierarquia de planos
    const hierarquia = ['Experimental', 'Maker Pro', 'Plano Fundador Pro', 'Commercial License'];
    const nivelUser = hierarquia.indexOf(userPlano);
    const nivelMinimo = hierarquia.indexOf(planoMinimo);
    return nivelUser >= nivelMinimo;
  };

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <style>{`
        .catalog-header {
          padding: 64px 40px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .catalog-eyebrow {
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: #3b82f6; margin-bottom: 14px;
        }
        .catalog-title {
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 900; color: #f1f5f9;
          letter-spacing: -0.03em; margin: 0 0 14px; line-height: 1.1;
        }
        .catalog-title span { color: #3b82f6; }
        .catalog-subtitle {
          font-size: 16px; color: #475569;
          max-width: 560px; line-height: 1.65; margin: 0;
        }
        .catalog-stats {
          display: flex; gap: 32px;
          margin-top: 32px; padding-top: 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .catalog-stat-value {
          font-size: 28px; font-weight: 900; color: #f1f5f9;
          letter-spacing: -0.03em; display: block;
        }
        .catalog-stat-label {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em; color: #334155;
        }
        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          padding: 0 40px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .card-wrapper { position: relative; text-decoration: none; }
        .card-lock-overlay {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 10;
          pointer-events: none;
        }
        .card-lock-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(251,191,36,0.15);
          border: 1px solid rgba(251,191,36,0.4);
          color: #fbbf24;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .card-lock-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          padding: 0 20px;
        }
        .admin-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 20;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .admin-badge-rascunho { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
        .admin-badge-inativo   { background: rgba(248,113,113,0.2); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
        .admin-badge-exclusivo { background: rgba(167,139,250,0.2); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
        .admin-badge-ativo     { background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.3); }
        @media (max-width: 640px) {
          .catalog-header { padding: 40px 20px 32px; }
          .catalog-grid { padding: 0 20px 60px; gap: 16px; }
        }
      `}</style>

      <div className="catalog-header">
        <p className="catalog-eyebrow">Catálogo MakerPro</p>
        <h1 className="catalog-title">
          Designs para<br />
          <span>impressão 3D</span>
        </h1>
        <p className="catalog-subtitle">
          Famílias de modelos paramétricos, prontos a personalizar.
          Ajusta as medidas, gera o STL e imprime.
        </p>
        <div className="catalog-stats">
          <div>
            <span className="catalog-stat-value">{familiaEntries.length}</span>
            <span className="catalog-stat-label">Famílias</span>
          </div>
          <div>
            <span className="catalog-stat-value">{totalModelos}</span>
            <span className="catalog-stat-label">Modelos</span>
          </div>
        </div>
      </div>

      <div className="catalog-grid">
        {familiaEntries.map(([familia, info]) => {
          const bloqueado = info.isExclusivo && !temAcesso(info.plano_minimo) && !isAdmin;
          const estadoFamilia = info.estado;

          return (
            <div key={familia} style={{ position: 'relative' }}>

              {/* Badge de estado — só admin vê */}
              {isAdmin && estadoFamilia !== 'ativo' && (
                <div className={`admin-badge admin-badge-${estadoFamilia}`}>
                  {estadoFamilia === 'rascunho' ? '✏️ Rascunho' :
                   estadoFamilia === 'inativo'   ? '⛔ Inativo' :
                   estadoFamilia === 'exclusivo' ? '⭐ Exclusivo' : estadoFamilia}
                </div>
              )}

              {/* Overlay de cadeado para exclusivos sem acesso */}
              {bloqueado && (
                <div className="card-lock-overlay">
                  <div className="card-lock-badge">
                    🔒 {info.plano_minimo ?? 'Plano necessário'}
                  </div>
                  <p className="card-lock-hint">
                    Faz upgrade para aceder a esta família
                  </p>
                </div>
              )}

              <Link
                href={bloqueado ? '/pricing' : `/familia/${encodeURIComponent(familia)}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
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
    </main>
  );
}
