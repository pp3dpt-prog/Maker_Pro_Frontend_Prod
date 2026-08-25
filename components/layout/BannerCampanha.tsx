// Banner Principal: mostra a campanha ativa mais recente do tipo "banner"
// (criada em /admin/campanhas) no topo de todas as páginas do site.
import { createClient as createAdmin } from '@supabase/supabase-js';

export default async function BannerCampanha() {
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const agora = new Date().toISOString();

  const { data } = await admin
    .from('prod_campanhas')
    .select('id, titulo, conteudo')
    .eq('tipo', 'banner')
    .eq('ativa', true)
    .or(`expira_em.is.null,expira_em.gt.${agora}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
      color: '#fff', textAlign: 'center', padding: '10px 16px',
      fontSize: 14, fontWeight: 600,
    }}>
      <strong>{data.titulo}</strong>
      {data.conteudo ? <span style={{ fontWeight: 400 }}> — {data.conteudo}</span> : null}
    </div>
  );
}
