// Lógica partilhada de publicação de um post (usada pela rota publicar-agora
// e pelo cron de agendados) — para não duplicar o fluxo em dois sítios.
// Posts com video_url são Reels; os outros são publicações de imagem.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  publicarFacebook, publicarInstagram, MetaApiError,
  publicarReelFacebook, criarContainerReelInstagram, estadoContainerInstagram, publicarContainerInstagram,
} from '@/lib/meta';

export type ResultadoPublicacao =
  | { ok: true; post: unknown }
  | { ok: false; pendente?: false; error: string }
  // Reel do Instagram ainda em processamento na Meta: fica 'agendado' e o cron conclui.
  | { ok: false; pendente: true; error: string };

export async function publicarPostMarketing(admin: SupabaseClient, postId: string): Promise<ResultadoPublicacao> {
  const { data: post, error } = await admin.from('prod_marketing_posts').select('*').eq('id', postId).maybeSingle();
  if (error || !post) return { ok: false, error: 'Post não encontrado.' };

  const videoUrl: string | null = post.video_url ?? null;
  const imagemPrincipal: string | undefined = post.imagens?.[0];
  if (!videoUrl && !imagemPrincipal) return { ok: false, error: 'Post sem imagem nem vídeo.' };

  const resultado: { meta_post_id?: string; meta_post_id_ig?: string; meta_container_ig?: string } = {};
  const querFacebook = post.canal === 'facebook' || post.canal === 'ambos';
  const querInstagram = post.canal === 'instagram' || post.canal === 'ambos';
  let instagramPendente = false;

  // Um canal que já tem ID da Meta já foi publicado (ex.: numa tentativa anterior
  // em que o outro canal falhou) — não voltamos a publicá-lo, para não duplicar.
  try {
    if (querFacebook && !post.meta_post_id) {
      if (videoUrl) {
        const r = await publicarReelFacebook(post.legenda, videoUrl);
        resultado.meta_post_id = r.videoId;
      } else {
        const r = await publicarFacebook(post.legenda, imagemPrincipal!);
        resultado.meta_post_id = r.postId;
      }
    }

    if (querInstagram && !post.meta_post_id_ig) {
      if (videoUrl) {
        let containerId: string | null = post.meta_container_ig ?? null;
        if (!containerId) {
          containerId = (await criarContainerReelInstagram(post.legenda, videoUrl)).containerId;
          resultado.meta_container_ig = containerId;
          // Guardar já: se o pedido acabar a meio, o próximo ciclo reaproveita este container.
          await admin.from('prod_marketing_posts').update({ meta_container_ig: containerId }).eq('id', postId);
        }
        const estado = await estadoContainerInstagram(containerId);
        if (estado === 'a_processar') {
          instagramPendente = true;
        } else {
          // 'publicado' só acontece se uma tentativa anterior publicou mas não chegou a gravar o ID.
          const r = estado === 'publicado' ? { mediaId: containerId } : await publicarContainerInstagram(containerId);
          resultado.meta_post_id_ig = r.mediaId;
        }
      } else {
        const r = await publicarInstagram(post.legenda, imagemPrincipal!);
        resultado.meta_post_id_ig = r.mediaId;
      }
    }
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro desconhecido ao publicar.';
    // Guardar o que já saiu, para a próxima tentativa só repetir o canal que falhou.
    // Um container de Reel com erro não serve para nova tentativa: limpa-se.
    await admin.from('prod_marketing_posts').update({
      estado: 'falhou',
      erro: msg,
      ...(videoUrl ? { meta_container_ig: null } : {}),
      ...(resultado.meta_post_id ?{ meta_post_id: resultado.meta_post_id } : {}),
      ...(resultado.meta_post_id_ig ? { meta_post_id_ig: resultado.meta_post_id_ig } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', postId);
    return { ok: false, error: msg };
  }

  if (instagramPendente) {
    // Fica agendado com a hora já passada: o próximo ciclo do cron volta a verificar e publica.
    await admin.from('prod_marketing_posts').update({
      estado: 'agendado',
      agendado_para: post.agendado_para ?? new Date().toISOString(),
      erro: null,
      ...(resultado.meta_post_id ? { meta_post_id: resultado.meta_post_id } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', postId);
    const fb = resultado.meta_post_id ? 'Já saiu no Facebook. ' : '';
    return {
      ok: false,
      pendente: true,
      error: `${fb}O Instagram ainda está a processar o vídeo; o Reel é publicado no próximo ciclo automático (até 30 min).`,
    };
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

  return { ok: true, post: atualizado };
}
