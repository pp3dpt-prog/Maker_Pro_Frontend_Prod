import { createClient } from '@supabase/supabase-js';

async function getReviews() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await admin
      .from('prod_reviews')
      .select('id, user_name, avaliacao, comentario, created_at')
      .eq('aprovado', true)
      .order('created_at', { ascending: false })
      .limit(6);
    return data ?? [];
  } catch { return []; }
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 16 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

export default async function ReviewsSection() {
  const reviews = await getReviews();
  if (reviews.length === 0) return null;

  const media = reviews.reduce((s: number, r: any) => s + r.avaliacao, 0) / reviews.length;

  return (
    <section style={{ padding: '80px 20px', background: '#080c10' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            O que dizem os utilizadores
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Avaliado com {media.toFixed(1)} ⭐
          </h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            Com base em {reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''} de utilizadores reais
          </p>
        </div>

        {/* Grid de reviews */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {reviews.map((r: any) => (
            <div key={r.id} style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <Stars n={r.avaliacao} />
              {r.comentario && (
                <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{r.comentario}"
                </p>
              )}
              <p style={{ margin: 0, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                — {r.user_name} · {new Date(r.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
