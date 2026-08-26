// Lógica partilhada de publicação de um post (usada pela rota publicar-agora
// e pelo cron de agendados) — para não duplicar o fluxo em dois sítios.
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicarFacebook, publicarInstagram, MetaApiError } from '@/lib/meta';

export async function publicarPostMarketing(admin: SupabaseClient, postId: string) {
  const { data: post, error } = await admin.from('prod_marketing_posts').select('*').eq('id', postId).maybeSingle();
  if (error || !post) return { ok: false as const, error: 'Post não encontrado.' };

  const imagemPrincipal: string | undefined = post.imagens?.[0];
  if (!imagemPrincipal) return { ok: false as const, error: 'Post sem imagem.' };

  const resultado: { meta_post_id?: string; meta_post_id_ig?: string } = {};

  try {
    if (post.canal === 'facebook' || post.canal === 'ambos') {
      const r = await publicarFacebook(post.legenda, imagemPrincipal);
      resultado.meta_post_id = r.postId;
    }
    if (post.canal === 'instagram' || post.canal === 'ambos') {
      const r = await publicarInstagram(post.legenda, imagemPrincipal);
      resultado.meta_post_id_ig = r.mediaId;
    }
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro desconhecido ao publicar.';
    await admin.from('prod_marketing_posts').update({ estado: 'falhou', erro: msg, updated_at: new Date().toISOString() }).eq('id', postId);
    return { ok: false as const, error: msg };
  }

  const { data: atualizado } = await admin
    .from('prod_marketing_posts')
    .update({
      estado: 'publicado',
      publicado_em: new Date().toISOString(),
      meta_post_id: resultado.meta_post_id ?? post.meta_post_id ?? null,
      meta_post_id_ig: resultado.meta_post_id_ig ?? post.meta_post_id_ig ?? null,
      erro: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single();

  return { ok: true as const, post: atualizado };
}
