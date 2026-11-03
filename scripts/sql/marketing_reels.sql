-- ============================================================================
-- Módulo Marketing — Reels (vídeo vertical gerado com o Wan 2.2)
-- Correr no Supabase SQL Editor ANTES do deploy do código dos Reels (idempotente).
-- ============================================================================

-- URL público do MP4 (720x1280, 30 fps) no bucket loja_produtos. Com video_url preenchido,
-- o post é publicado como Reel; imagens[0] passa a ser só a miniatura na fila do admin.
alter table public.prod_marketing_posts add column if not exists video_url text;

-- Container do Reel no Instagram enquanto a Meta processa o vídeo (pode demorar minutos).
-- O cron de 30 em 30 min volta a verificar e publica quando estiver pronto.
alter table public.prod_marketing_posts add column if not exists meta_container_ig text;

-- Para agrupar as abordagens (A, B, …) geradas a partir do mesmo modelo/texto.
alter table public.prod_marketing_posts add column if not exists abordagem text;
